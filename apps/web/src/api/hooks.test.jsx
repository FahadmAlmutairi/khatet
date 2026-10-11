import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { keys, useMoveTask } from './hooks.js'

vi.mock('./client.js', () => ({ api: { moveTask: vi.fn() } }))
const { api } = await import('./client.js')

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const task = (id, status, position) => ({ id, projectId: 'p-1', status, position, isBlocked: false, blockedReason: null })

describe('useMoveTask (US-16)', () => {
  it('keeps a later move on screen when an earlier move answers first', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
    queryClient.setQueryData(keys.tasks('p-1'), [task('a', 'TODO', 1), task('b', 'TODO', 2)])
    const first = deferred()
    const second = deferred()
    api.moveTask.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useMoveTask('p-1'), { wrapper })
    const statusOf = (id) => queryClient.getQueryData(keys.tasks('p-1')).find((item) => item.id === id).status

    act(() => result.current.mutate({ taskId: 'a', status: 'DONE', position: 1 }))
    act(() => result.current.mutate({ taskId: 'b', status: 'DONE', position: 2 }))
    await waitFor(() => expect(statusOf('b')).toBe('DONE'))

    // The first answer was computed before the second move, so it still has b in To Do.
    await act(async () => first.resolve([task('a', 'DONE', 1), task('b', 'TODO', 1)]))
    expect(statusOf('a')).toBe('DONE')
    expect(statusOf('b')).toBe('DONE')

    await act(async () => second.resolve([task('a', 'DONE', 1), task('b', 'DONE', 2)]))
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    expect(statusOf('b')).toBe('DONE')
  })
})
