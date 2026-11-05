import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/errors.js'
import { addSampleMessage, failNextCall, getMessages, resetMockServer } from '../../api/mockServer.js'
import { renderApp } from '../../test/renderApp.jsx'

async function openChat(user, path = '/projects/p-khatet/board') {
  renderApp(path)
  await user.click(await screen.findByRole('button', { name: 'Project chat' }))
  return screen.findByRole('complementary', { name: 'Project chat' })
}

describe('project chat (US-24)', () => {
  it('opens from the board with the messages, oldest first, and focus in the message box', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    const panel = await openChat(user)
    const log = await within(panel).findByRole('log', { name: 'Messages' })
    const items = within(log).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('saad')
    expect(items[0]).toHaveTextContent('I pushed the sign-in screens')
    expect(items[1]).toHaveTextContent('fahad (you)')
    expect(within(panel).getByRole('textbox', { name: 'Message' })).toHaveFocus()
  })

  it('sends a message with Enter and clears the box', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    const panel = await openChat(user)
    const box = within(panel).getByRole('textbox', { name: 'Message' })
    await user.type(box, 'Standup at 10?{Enter}')
    expect(await within(panel).findByText('Standup at 10?')).toBeInTheDocument()
    expect(box).toHaveValue('')
    expect((await getMessages('p-khatet')).at(-1)).toMatchObject({ text: 'Standup at 10?', authorUsername: 'fahad' })
  })

  it('keeps Shift+Enter as a new line', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    const panel = await openChat(user)
    const box = within(panel).getByRole('textbox', { name: 'Message' })
    await user.type(box, 'Line one{Shift>}{Enter}{/Shift}Line two')
    expect(box).toHaveValue('Line one\nLine two')
  })

  it('does not send an empty message and says why', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    const panel = await openChat(user)
    await within(panel).findByRole('log')
    await user.type(within(panel).getByRole('textbox', { name: 'Message' }), '   {Enter}')
    expect(within(panel).getByRole('alert')).toHaveTextContent('Write a message first.')
    expect(within(panel).getByRole('textbox', { name: 'Message' })).toHaveAttribute('aria-invalid', 'true')
    expect(await getMessages('p-khatet')).toHaveLength(3)
  })

  it('lets a view-only member send messages', async () => {
    resetMockServer({ signedInAs: 'u-ali' })
    const user = userEvent.setup()
    const panel = await openChat(user)
    await user.type(within(panel).getByRole('textbox', { name: 'Message' }), 'I can read the board')
    await user.click(within(panel).getByRole('button', { name: 'Send message' }))
    expect(await within(panel).findByText('I can read the board')).toBeInTheDocument()
  })

  it('shows an empty state in a project without messages', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    const panel = await openChat(user, '/projects/p-study/board')
    expect(await within(panel).findByText('No messages yet')).toBeInTheDocument()
  })

  it("shows a teammate's new message on the next refresh", async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    const panel = await openChat(user)
    await within(panel).findByRole('log')
    addSampleMessage('p-khatet', 'u-omar', 'Review done, looks good')
    expect(await within(panel).findByText('Review done, looks good', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('keeps the text and shows the error when sending fails', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    const panel = await openChat(user)
    failNextCall('sendMessage', new ApiError({ code: 'NETWORK', status: 0, message: 'Khatet could not be reached.' }))
    const box = within(panel).getByRole('textbox', { name: 'Message' })
    await user.type(box, 'Hello{Enter}')
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Khatet could not be reached.')
    expect(box).toHaveValue('Hello')
  })

  it('shows an error with Try again when the chat cannot load', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    failNextCall('getMessages', new ApiError({ code: 'NETWORK', status: 0, message: 'Khatet could not be reached.' }))
    const user = userEvent.setup()
    const panel = await openChat(user)
    expect(await within(panel).findByText('The chat could not be loaded')).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Try again' }))
    expect(await within(panel).findByRole('log')).toBeInTheDocument()
  })

  it('closes with Esc and returns focus to the chat button', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const user = userEvent.setup()
    await openChat(user)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Project chat' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Project chat' })).toHaveFocus())
  })
})
