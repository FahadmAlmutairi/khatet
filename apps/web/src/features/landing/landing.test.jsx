import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { resetMockServer } from '../../api/mockServer.js'
import { renderApp } from '../../test/renderApp.jsx'

describe('public landing page', () => {
  it('shows a signed-out visitor the landing page at the main address', async () => {
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'One calm plan for your whole team.' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')

    // Every way in: create an account, sign in, or open the live demo.
    for (const link of screen.getAllByRole('link', { name: /Get started/ })) expect(link).toHaveAttribute('href', '/sign-in')
    for (const link of screen.getAllByRole('link', { name: /Try the live demo/ })) expect(link).toHaveAttribute('href', '/demo')
    expect(screen.getByRole('link', { name: 'Start the guided tour' })).toHaveAttribute('href', '/demo')
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute('href', '/sign-in')
  })

  it('sends a signed-in person straight to their projects', async () => {
    resetMockServer({ signedInAs: 'u-fahad' })
    const router = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Your projects' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/projects')
  })

  it('lets the visitor pause the preview and pick a step', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const preview = (await screen.findByRole('list', { name: 'Preview steps' })).closest('figure')
    await user.click(within(preview).getByRole('button', { name: 'Pause the preview' }))
    expect(within(preview).getByRole('button', { name: 'Play the preview' })).toBeInTheDocument()

    await user.click(within(preview).getByRole('button', { name: 'Flag a blocker' }))
    expect(within(preview).getByRole('button', { name: 'Flag a blocker' })).toHaveAttribute('aria-current', 'step')
  })

  it('explains each task access level in words', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const list = await screen.findByRole('list', { name: 'What omar can do' })
    const access = screen.getByRole('group', { name: 'Task access for omar' })

    // The default: omar edits only the task assigned to omar.
    expect(within(list).getAllByText('Can edit')).toHaveLength(1)
    await user.click(within(access).getByRole('button', { name: 'View tasks only' }))
    expect(within(list).queryByText('Can edit')).not.toBeInTheDocument()
    expect(screen.getByText(/omar sees every task and uses chat, but cannot change tasks/)).toBeInTheDocument()
    await user.click(within(access).getByRole('button', { name: 'Edit all tasks' }))
    await waitFor(() => expect(within(list).getAllByText('Can edit')).toHaveLength(3))
  })
})
