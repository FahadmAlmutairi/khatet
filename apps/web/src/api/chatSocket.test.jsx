import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { keys, useMessages } from './hooks.js'

// A stand-in for the Socket.IO client: it records listeners and emits, and lets a test play
// the server's side.
function createFakeSocket() {
  const listeners = new Map()
  const fake = {
    connected: false,
    joinAnswer: { ok: true },
    emitted: [],
    on: (event, handler) => listeners.set(event, [...(listeners.get(event) ?? []), handler]),
    off: (event, handler) => listeners.set(event, (listeners.get(event) ?? []).filter((item) => item !== handler)),
    connect: vi.fn(() => {
      fake.connected = true
      fake.serverSends('connect')
    }),
    disconnect: vi.fn(() => {
      fake.connected = false
    }),
    timeout: () => fake,
    emit: (event, payload, ack) => {
      fake.emitted.push([event, payload])
      if (event === 'chat:join') ack(null, fake.joinAnswer)
    },
    serverSends: (event, payload) => (listeners.get(event) ?? []).forEach((handler) => handler(payload)),
  }
  return fake
}

const socket = createFakeSocket()
vi.mock('./chatSocket.js', async () => {
  const actual = await vi.importActual('./chatSocket.js')
  return { ...actual, chatSocketEnabled: true, getChatSocket: () => Promise.resolve(socket) }
})
vi.mock('./client.js', () => ({ api: { getMessages: vi.fn() } }))
const { api } = await import('./client.js')

const message = (id, text) => ({ id, projectId: 'p-1', authorId: 'u-1', authorUsername: 'saad', text, createdAt: '2026-11-17T10:00:00Z' })

function renderChat(enabled = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const view = renderHook(({ open }) => useMessages('p-1', { enabled: open }), { wrapper, initialProps: { open: enabled } })
  return { ...view, queryClient }
}

describe('chat over Socket.IO (TR-05)', () => {
  it('joins the project room, adds message:new to the chat and stops the 3-second refresh', async () => {
    api.getMessages.mockResolvedValue([message('m-1', 'Hello')])
    const { result, queryClient, rerender } = renderChat()
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(socket.emitted).toContainEqual(['chat:join', { projectId: 'p-1' }])
    await waitFor(() => expect(queryClient.getQueryCache().find({ queryKey: keys.messages('p-1') }).options.refetchInterval).toBe(false))

    act(() => socket.serverSends('message:new', message('m-2', 'Live')))
    await waitFor(() => expect(result.current.data.map((item) => item.text)).toEqual(['Hello', 'Live']))
    // The same message again (for example after a refresh) is not shown twice.
    act(() => socket.serverSends('message:new', message('m-2', 'Live')))
    expect(queryClient.getQueryData(keys.messages('p-1'))).toHaveLength(2)
    // A message for another project is ignored.
    act(() => socket.serverSends('message:new', { ...message('m-3', 'Elsewhere'), projectId: 'p-2' }))
    expect(queryClient.getQueryData(keys.messages('p-1'))).toHaveLength(2)

    rerender({ open: false })
    expect(socket.emitted).toContainEqual(['chat:leave', { projectId: 'p-1' }])
    expect(socket.disconnect).toHaveBeenCalled()
  })

  it('goes back to refreshing every 3 seconds when the socket drops or the room is refused', async () => {
    api.getMessages.mockResolvedValue([message('m-1', 'Hello')])
    socket.joinAnswer = { ok: true }
    const { result, queryClient, unmount } = renderChat()
    const interval = () => queryClient.getQueryCache().find({ queryKey: keys.messages('p-1') }).options.refetchInterval
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    await waitFor(() => expect(interval()).toBe(false))

    act(() => socket.serverSends('disconnect'))
    await waitFor(() => expect(interval()).toBe(3000))

    socket.joinAnswer = { ok: false, error: { code: 'NOT_FOUND', message: 'Not a member' } }
    act(() => socket.serverSends('connect'))
    await act(async () => {})
    expect(interval()).toBe(3000)
    unmount()
  })
})
