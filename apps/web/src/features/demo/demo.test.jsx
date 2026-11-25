import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { isDemoSession, shiftSampleDates } from '../../api/demoSession.js'
import { renderApp } from '../../test/renderApp.jsx'

describe('live demo and guided tour', () => {
  it('opens the sample project with a banner and the first tour step', async () => {
    const router = renderApp('/demo')
    await waitFor(() => expect(router.state.location.pathname).toBe('/projects/p-khatet/overview'))
    expect(isDemoSession()).toBe(true)

    const banner = await screen.findByRole('region', { name: 'Live demo' })
    expect(within(banner).getByRole('button', { name: 'Restart tour' })).toBeInTheDocument()
    const tour = await screen.findByRole('dialog', { name: 'Start with what needs attention' })
    expect(within(tour).getByText('Step 1 of 7')).toBeInTheDocument()
  })

  it('walks through the real pages with Next and Back, and closes with Escape', async () => {
    const user = userEvent.setup()
    const router = renderApp('/demo')
    const first = await screen.findByRole('dialog', { name: 'Start with what needs attention' })

    await user.click(within(first).getByRole('button', { name: 'Next' }))
    const second = await screen.findByRole('dialog', { name: 'Move work across the board' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/projects/p-khatet/board'))
    // The step that teaches dragging also names the keyboard path.
    expect(within(second).getByText(/open its More actions menu and choose Move to/)).toBeInTheDocument()

    await user.click(within(second).getByRole('button', { name: 'Back' }))
    await screen.findByRole('dialog', { name: 'Start with what needs attention' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/projects/p-khatet/overview'))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Start with what needs attention' })).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Restart tour' }))
    expect(await screen.findByRole('dialog', { name: 'Start with what needs attention' })).toBeInTheDocument()
  })

  it('can open without the tour', async () => {
    const router = renderApp('/demo?tour=off')
    await screen.findByRole('region', { name: 'Live demo' })
    expect(router.state.location.pathname).toBe('/projects/p-khatet/overview')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('leaves the demo back to the landing page', async () => {
    const user = userEvent.setup()
    const router = renderApp('/demo?tour=off')
    const banner = await screen.findByRole('region', { name: 'Live demo' })
    await user.click(within(banner).getByRole('button', { name: 'Leave demo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(isDemoSession()).toBe(false)
    expect(await screen.findByRole('heading', { level: 1, name: 'One calm plan for your whole team.' })).toBeInTheDocument()
  })
})

describe('sample dates in the demo', () => {
  const now = Date.parse('2026-11-25T12:00:00Z')

  it('moves every date by the same number of days, so due dates fall around today', () => {
    const shifted = shiftSampleDates({ tasks: [{ dueDate: '2026-10-05' }, { dueDate: '2026-10-08' }], title: '2026-10-05 plan' }, now)
    expect(shifted.tasks.map((task) => task.dueDate)).toEqual(['2026-11-25', '2026-11-28'])
    // Text that only contains a date is left alone.
    expect(shifted.title).toBe('2026-10-05 plan')
  })

  it('moves timestamps by the same days and keeps the gaps between them', () => {
    const shifted = shiftSampleDates({ messages: [{ at: '2026-10-05T09:00:00Z' }, { at: '2026-10-05T11:30:00Z' }] }, now)
    expect(shifted.messages.map((message) => message.at)).toEqual(['2026-11-25T09:00:00.000Z', '2026-11-25T11:30:00.000Z'])
  })

  it('keeps the newest timestamp at least ten minutes old, never in the future', () => {
    const shifted = shiftSampleDates({ messages: [{ at: '2026-10-05T09:00:00Z' }, { at: '2026-10-05T11:58:00Z' }] }, now)
    const [older, newer] = shifted.messages.map((message) => Date.parse(message.at))
    expect(newer).toBe(now - 10 * 60 * 1000)
    expect(newer - older).toBe(178 * 60 * 1000)
  })
})
