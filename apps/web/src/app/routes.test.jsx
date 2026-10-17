import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client.js'
import { ApiError } from '../api/errors.js'
import { createProject, createTask, failNextCall, getTasks, resetMockServer } from '../api/mockServer.js'
import { dateFromToday, formatDueDate } from '../lib/domain.js'
import { renderApp } from '../test/renderApp.jsx'

function signIn() {
  resetMockServer({ signedInAs: 'u-fahad' })
}

describe('sign in (US-01, US-02)', () => {
  it('sends a signed-out visitor to sign in', async () => {
    const router = renderApp('/projects')
    expect(await screen.findByRole('heading', { name: 'Sign in or create an account' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('rejects a wrong code with a message, then signs in', async () => {
    const user = userEvent.setup()
    renderApp('/sign-in')
    await user.type(await screen.findByLabelText(/Email/), 'fahad@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue with email' }))
    expect(await screen.findByText(/It expires in 10 minutes/)).toBeInTheDocument()

    expect(screen.getByRole('group', { name: /Verification code/ })).toBeInTheDocument()
    const firstDigit = screen.getByRole('textbox', { name: 'Digit 1 of 6' })
    // The code is checked as soon as the last digit is in, without pressing Verify.
    await user.type(firstDigit, '000000')
    expect(await screen.findByText('That code is not right. Check the email and try again.')).toBeInTheDocument()
    expect(firstDigit).toHaveAttribute('aria-invalid', 'true')
    expect(firstDigit).toHaveFocus()
    // A caret after the digit, not a highlighted digit.
    expect([firstDigit.selectionStart, firstDigit.selectionEnd]).toEqual([1, 1])

    await user.type(firstDigit, '123456')
    expect(await screen.findByRole('heading', { name: 'Your projects' })).toBeInTheDocument()
  })

  it('checks a full code once, even when Verify is also pressed', async () => {
    // Hold each check briefly so Verify can be pressed while the automatic one is still on its way.
    const original = api.verifyCode
    const verifyCode = vi
      .spyOn(api, 'verifyCode')
      .mockImplementation((code) => new Promise((resolve) => setTimeout(resolve, 50)).then(() => original(code)))
    const user = userEvent.setup()
    renderApp('/sign-in')
    await user.type(await screen.findByLabelText(/Email/), 'fahad@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue with email' }))
    const firstDigit = await screen.findByRole('textbox', { name: 'Digit 1 of 6' })

    await user.type(firstDigit, '00000')
    expect(verifyCode).not.toHaveBeenCalled()
    await user.type(screen.getByRole('textbox', { name: 'Digit 6 of 6' }), '0')
    fireEvent.submit(firstDigit.closest('form'))
    expect(await screen.findByText('That code is not right. Check the email and try again.')).toBeInTheDocument()
    expect(verifyCode).toHaveBeenCalledTimes(1)

    // Verify still works on its own, for example to try the same code again.
    await user.click(screen.getByRole('button', { name: 'Verify code' }))
    await waitFor(() => expect(verifyCode).toHaveBeenCalledTimes(2))
    verifyCode.mockRestore()
  })

  it('shows no step count on the sign-in pages', async () => {
    renderApp('/sign-in')
    await screen.findByRole('heading', { name: 'Sign in or create an account' })
    expect(screen.queryByText(/Step \d of 3/)).not.toBeInTheDocument()
  })

  it('asks a new user for a unique username', async () => {
    const user = userEvent.setup()
    renderApp('/sign-in')
    await user.type(await screen.findByLabelText(/Email/), 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue with email' }))
    await user.click(await screen.findByRole('textbox', { name: 'Digit 1 of 6' }))
    await user.paste('123456')

    const username = await screen.findByLabelText(/username/i)
    await user.type(username, 'saad')
    await user.click(screen.getByRole('button', { name: 'Finish account' }))
    expect(await screen.findByText('saad is taken. Try another username.')).toBeInTheDocument()

    await user.clear(username)
    await user.type(username, 'new_member')
    await user.click(screen.getByRole('button', { name: 'Finish account' }))
    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument()
  })
})

describe('projects (US-04, US-05)', () => {
  it('lists each project with the user role', async () => {
    signIn()
    renderApp('/projects')
    const khatet = await screen.findByRole('link', { name: /Khatet.*Owner/ })
    expect(khatet).toHaveAttribute('href', '/projects/p-khatet/board')
    expect(screen.getByRole('link', { name: /Capstone Research.*Member/ })).toBeInTheDocument()
  })

  it('creates a project and makes the creator its owner', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects')
    await user.click(await screen.findByRole('button', { name: 'Create project' }))
    const dialog = screen.getByRole('dialog', { name: 'Create a project' })
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }))
    expect(await within(dialog).findByText('Enter a project name.')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Project name/), 'Thesis')
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }))
    expect(await screen.findByRole('link', { name: /Thesis.*Owner/ })).toBeInTheDocument()
  })
})

describe('loading and messages (G8, G10)', () => {
  it('shows the board shape while it loads and lets a message be closed', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    expect(await screen.findByText('Loading the board…')).toBeInTheDocument()
    const card = await screen.findByRole('button', { name: 'More actions for Prepare usability test script' })
    await user.click(card)
    await user.click(screen.getByRole('menuitem', { name: /Done/ }))
    await screen.findByText('“Prepare usability test script” moved to Done.', { selector: '[aria-live]' })
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }))
    expect(screen.queryByRole('button', { name: 'Dismiss message' })).not.toBeInTheDocument()
  })
})

describe('sidebar', () => {
  it('collapses to a rail, opens from any empty part of it and remembers the choice', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }))
    expect(localStorage.getItem('khatet.sidebarCollapsed')).toBe('true')
    const rail = screen.getByRole('complementary', { name: 'Sidebar' })
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveFocus()
    expect(within(rail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/projects')
    expect(within(rail).getByRole('button', { name: 'Khatet' })).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()

    await user.click(rail)
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(localStorage.getItem('khatet.sidebarCollapsed')).toBe('false')

    await user.keyboard('{Control>}\\{/Control}')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })
  it('shows a project\'s pages in the sidebar instead of opening its board', async () => {
    signIn()
    const user = userEvent.setup()
    const router = renderApp('/projects')
    const sidebar = await screen.findByRole('complementary')
    const project = await within(sidebar).findByRole('button', { name: 'Khatet' })
    expect(project).toHaveAttribute('aria-expanded', 'false')
    await user.click(project)
    expect(project).toHaveAttribute('aria-expanded', 'true')
    expect(router.state.location.pathname).toBe('/projects')
    expect(within(sidebar).getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/projects/p-khatet/members')
    await user.click(within(sidebar).getByRole('link', { name: 'Board' }))
    expect(router.state.location.pathname).toBe('/projects/p-khatet/board')
    await user.click(project)
    expect(within(sidebar).queryByRole('link', { name: 'Board' })).not.toBeInTheDocument()
  })

  it('opens the sidebar on a project\'s pages from its rail tile', async () => {
    signIn()
    localStorage.setItem('khatet.sidebarCollapsed', 'true')
    const user = userEvent.setup()
    const router = renderApp('/projects')
    const rail = await screen.findByRole('complementary', { name: 'Sidebar' })
    await user.click(await within(rail).findByRole('button', { name: 'Khatet' }))
    expect(router.state.location.pathname).toBe('/projects')
    expect(screen.getByRole('button', { name: 'Khatet', expanded: true })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/projects/p-khatet/board')
  })
})

describe('page names (G7, G12)', () => {
  it('heads the board with the project name, names the tab and links back through the breadcrumb', async () => {
    signIn()
    renderApp('/projects/p-khatet/board')
    expect(await screen.findByRole('heading', { level: 1, name: 'Khatet' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Board · Khatet · Khatet'))
    const crumbs = screen.getAllByRole('navigation', { name: 'Breadcrumb' })[0]
    expect(within(crumbs).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/projects')
    expect(within(crumbs).getByText('Board')).toHaveAttribute('aria-current', 'page')
  })

  it('names the members page in the tab', async () => {
    signIn()
    renderApp('/projects/p-khatet/members')
    await waitFor(() => expect(document.title).toBe('Members · Khatet · Khatet'))
  })
})

describe('board (US-16, US-21)', () => {
  it('groups tasks by status with text labels and shows card details', async () => {
    signIn()
    renderApp('/projects/p-khatet/board')
    for (const label of ['Backlog', 'To Do', 'In Progress', 'Ready for Review', 'Done']) {
      expect(await screen.findByRole('heading', { name: new RegExp(`^${label}`) })).toBeInTheDocument()
    }
    const inProgress = screen.getByRole('region', { name: /^In Progress/ })
    expect(within(inProgress).getByText('Blocked')).toBeInTheDocument()
    expect(within(inProgress).getByRole('img', { name: 'Assigned to fahad, omar' })).toBeInTheDocument()
  })

  it('keeps Backlog collapsed under the lanes until it is opened', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    const toggle = await screen.findByRole('button', { name: 'Show backlog' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Collect interview notes')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide backlog' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Collect interview notes')).toBeInTheDocument()
  })

  it('moves a task with the Move to menu', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'More actions for Prepare usability test script' }))
    await user.click(screen.getByRole('menuitem', { name: /Done/ }))
    const done = screen.getByRole('region', { name: /^Done/ })
    expect(await within(done).findByText('Prepare usability test script')).toBeInTheDocument()
    expect(await screen.findByText('“Prepare usability test script” moved to Done.', { selector: '[aria-live]' })).toBeInTheDocument()
  })

  it('undoes a move and puts the card back in its place', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'More actions for Prepare usability test script' }))
    await user.click(screen.getByRole('menuitem', { name: /Done/ }))
    await screen.findByText('“Prepare usability test script” moved to Done.', { selector: '[aria-live]' })
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    const todo = screen.getByRole('region', { name: /^To Do/ })
    await waitFor(() => expect(within(todo).getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('Prepare usability test script'))
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('keeps the Blocked flag and reason when a move out of In Progress is undone', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'More actions for Fix CSV validation errors' }))
    await user.click(screen.getByRole('menuitem', { name: /Done/ }))
    await screen.findByText('“Fix CSV validation errors” moved to Done.', { selector: '[aria-live]' })
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(async () => {
      const task = (await getTasks('p-khatet')).find((item) => item.id === 't-6')
      expect(task).toMatchObject({ status: 'IN_PROGRESS', isBlocked: true, blockedReason: 'Waiting for sample file' })
    })
    const inProgress = screen.getByRole('region', { name: /^In Progress/ })
    await waitFor(() => expect(within(inProgress).getByText('Blocked')).toBeInTheDocument())
  })

  it('puts the card back and explains when a move fails', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'More actions for Prepare usability test script' }))
    failNextCall('moveTask', new ApiError({ code: 'MOVE_FAILED', status: 500, message: 'The server did not answer.' }))
    await user.click(screen.getByRole('menuitem', { name: /Done/ }))
    expect(await screen.findByText(/could not be moved and is back in its place/, { selector: '[aria-live]' })).toBeInTheDocument()
    const todo = screen.getByRole('region', { name: /^To Do/ })
    await waitFor(() => expect(within(todo).getByText('Prepare usability test script')).toBeInTheDocument())
  })

  it('labels an overdue date in words, not only by colour', async () => {
    signIn()
    renderApp('/projects/p-khatet/board')
    const review = await screen.findByRole('region', { name: /^Ready for Review/ })
    expect(within(review).getByText('Overdue · 20 Sep')).toBeInTheDocument()
    expect(screen.queryByText('This project has no tasks yet.')).not.toBeInTheDocument()
  })

  it('shows empty lanes with an Add task action in To Do', async () => {
    signIn()
    const user = userEvent.setup()
    const project = await createProject({ name: 'Empty project' })
    renderApp(`/projects/${project.id}/board`)
    const todo = await screen.findByRole('region', { name: /^To Do/ })
    expect(screen.getByText('This project has no tasks yet.')).toBeInTheDocument()
    expect(screen.getByText('Add the first task to start the board.')).toBeInTheDocument()
    expect(within(todo).getByText('No tasks yet.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /^Done/ })).queryByRole('button', { name: 'Add task' })).not.toBeInTheDocument()
    await user.click(within(todo).getByRole('button', { name: 'Add task' }))
    expect(await screen.findByRole('dialog', { name: /Create a task/ })).toBeInTheDocument()
  })

  it('shows a board of 30 tasks (NFR-07)', async () => {
    signIn()
    for (let index = 1; index <= 22; index += 1) {
      await createTask('p-khatet', { title: `Sample task ${index}`, assigneeIds: ['u-fahad'] })
    }
    renderApp('/projects/p-khatet/board')
    const todo = await screen.findByRole('region', { name: /^To Do/ })
    expect(within(todo).getAllByRole('listitem')).toHaveLength(25)
    expect(within(todo).getByText('Sample task 22')).toBeInTheDocument()
  })

  it('shows a member without edit access no move or create controls', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-capstone/board')
    expect(await screen.findByText('View only')).toBeInTheDocument()
    await user.hover(screen.getByRole('button', { name: 'About View only' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('You can view tasks but not change them')
    await user.unhover(screen.getByRole('button', { name: 'About View only' }))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add task' })).not.toBeInTheDocument()
    await user.click((await screen.findAllByRole('button', { name: /^More actions for/ }))[0])
    expect(screen.queryByText('Move to')).not.toBeInTheDocument()
  })
})

describe('tasks (US-13, US-14, US-15, US-17, US-18)', () => {
  it('shows field errors, then creates a task in To Do', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'Add task' }))
    const dialog = screen.getByRole('dialog', { name: 'Create a task' })
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }))
    expect(await within(dialog).findByText('Enter a task title.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose at least one assignee.')).toBeInTheDocument()
    const summary = within(dialog).getByRole('alert')
    expect(summary).toHaveTextContent('Fix 2 fields to create the task')
    expect(summary).toHaveFocus()
    await user.click(within(summary).getByRole('link', { name: /Task title: enter a task title/ }))
    expect(within(dialog).getByLabelText(/Task title/)).toHaveFocus()

    await user.type(within(dialog).getByLabelText(/Task title/), 'Plan the demo')
    await user.click(within(dialog).getByRole('button', { name: /Add assignee/ }))
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search members' }), 'sa')
    expect(within(dialog).queryByRole('button', { name: 'omar' })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'saad' }))
    expect(within(dialog).getByRole('button', { name: 'saad' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }))
    const todo = screen.getByRole('region', { name: /^To Do/ })
    expect(await within(todo).findByText('Plan the demo')).toBeInTheDocument()
  })

  it('fills the due date with a shortcut and saves with Ctrl+Enter', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'Add task' }))
    const dialog = screen.getByRole('dialog', { name: 'Create a task' })
    await user.click(within(dialog).getByRole('button', { name: 'Tomorrow' }))
    expect(within(dialog).getByLabelText('Due date')).toHaveValue(dateFromToday(1))
    expect(within(dialog).getByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(dialog).getByRole('button', { name: /Add assignee/ }))
    await user.click(within(dialog).getByRole('button', { name: 'saad' }))
    await user.type(within(dialog).getByLabelText(/Task title/), 'Book the lab{Control>}{Enter}{/Control}')
    const todo = screen.getByRole('region', { name: /^To Do/ })
    expect(await within(todo).findByText('Book the lab')).toBeInTheDocument()
    expect(within(todo).getByText(`Due ${formatDueDate(dateFromToday(1), { short: true })}`)).toBeInTheDocument()
  })

  it('picks a priority from the pills and writes the picked date in words', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'Add task' }))
    const dialog = screen.getByRole('dialog', { name: 'Create a task' })
    const priority = within(dialog).getByRole('group', { name: 'Priority' })
    expect(within(priority).getByRole('radio', { name: 'None' })).toBeChecked()
    await user.click(within(priority).getByRole('radio', { name: 'High' }))
    expect(within(priority).getByRole('radio', { name: 'High' })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Tomorrow' }))
    expect(within(dialog).getByText(new RegExp(`^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) ${formatDueDate(dateFromToday(1), { short: true })}$`))).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Add assignee/ }))
    await user.click(within(dialog).getByRole('button', { name: 'saad' }))
    await user.type(within(dialog).getByLabelText(/Task title/), 'Print the consent forms')
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }))
    const todo = screen.getByRole('region', { name: /^To Do/ })
    const card = (await within(todo).findByText('Print the consent forms')).closest('li')
    expect(within(card).getByText('High')).toBeInTheDocument()
  })

  it('asks before discarding a half-filled new task', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board')
    await user.click(await screen.findByRole('button', { name: 'Add task' }))
    const dialog = screen.getByRole('dialog', { name: 'Create a task' })
    await user.type(within(dialog).getByLabelText(/Task title/), 'Half a thought')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    const confirm = await screen.findByRole('dialog', { name: 'Discard your changes?' })
    await user.click(within(confirm).getByRole('button', { name: 'Keep editing' }))
    expect(within(dialog).getByLabelText(/Task title/)).toHaveValue('Half a thought')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Discard your changes?' })).getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create a task' })).not.toBeInTheDocument())
  })

  it('asks before closing task details with unsaved edits', async () => {
    signIn()
    const user = userEvent.setup()
    const router = renderApp('/projects/p-khatet/board?task=t-8')
    const drawer = await screen.findByRole('dialog', { name: 'Define board hierarchy' })
    await user.click(await within(drawer).findByRole('button', { name: 'Edit' }))
    await user.type(within(drawer).getByLabelText(/Task title/), ' v2')
    await user.click(within(drawer).getAllByRole('button', { name: 'Close' })[0])
    const confirm = await screen.findByRole('dialog', { name: 'Discard your changes?' })
    await user.click(within(confirm).getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('edits a task and keeps at least one assignee', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board?task=t-8')
    const drawer = await screen.findByRole('dialog', { name: 'Define board hierarchy' })
    await user.click(await within(drawer).findByRole('button', { name: 'Edit' }))
    await user.click(within(drawer).getByRole('button', { name: 'Remove fahad' }))
    await user.click(within(drawer).getByRole('button', { name: 'Remove saad' }))
    await user.click(within(drawer).getByRole('button', { name: 'Save changes' }))
    expect(await within(drawer).findByText('Choose at least one assignee.')).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: /Add assignee/ }))
    await user.click(within(drawer).getByRole('button', { name: 'omar' }))
    await user.clear(within(drawer).getByLabelText(/Task title/))
    await user.type(within(drawer).getByLabelText(/Task title/), 'Define board rules')
    await user.click(within(drawer).getByRole('button', { name: 'Save changes' }))
    expect(await within(drawer).findByText('omar')).toBeInTheDocument()
    const review = screen.getByRole('region', { name: /^Ready for Review/ })
    expect(within(review).getByText('Define board rules')).toBeInTheDocument()
  })

  it('changes the status from the status button in task details', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board?task=t-8')
    const details = await screen.findByRole('dialog', { name: 'Define board hierarchy' })
    await user.click(await within(details).findByRole('button', { name: /^Status: Ready for Review/ }))
    expect(screen.getByRole('menuitem', { name: /Ready for Review/ })).toHaveAttribute('aria-current', 'true')
    await user.click(screen.getByRole('menuitem', { name: /Done/ }))
    expect(await within(details).findByRole('button', { name: /^Status: Done/ })).toBeInTheDocument()
    const done = screen.getByRole('region', { name: /^Done/ })
    expect(within(done).getByText('Define board hierarchy')).toBeInTheDocument()
  })

  it('flags an In Progress task as blocked', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board?task=t-7')
    const toggle = await screen.findByRole('switch', { name: 'Blocked' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await user.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    const inProgress = screen.getByRole('region', { name: /^In Progress/ })
    expect(within(inProgress).getAllByText(/^Blocked/)).toHaveLength(2)
  })

  it('saves the blocked reason when the field loses focus', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board?task=t-7')
    const toggle = await screen.findByRole('switch', { name: 'Blocked' })
    await user.click(toggle)
    await user.type(await screen.findByLabelText('Reason (optional)'), 'Waiting for the lab key')
    await user.tab()
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save reason' })).not.toBeInTheDocument()
    await waitFor(async () => {
      const tasks = await getTasks('p-khatet')
      expect(tasks.find((task) => task.id === 't-7').blockedReason).toBe('Waiting for the lab key')
    })
  })

  it('deletes a task after confirmation', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board?task=t-4')
    const drawer = await screen.findByRole('dialog', { name: 'Write sign-in error messages' })
    await user.click(await within(drawer).findByRole('button', { name: 'More actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete task' }))
    const confirm = screen.getByRole('dialog', { name: 'Delete this task?' })
    await user.click(within(confirm).getByRole('button', { name: 'Delete task' }))
    expect(await screen.findByText('“Write sign-in error messages” was deleted.', { selector: '[aria-live]' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Write sign-in error messages' })).not.toBeInTheDocument()
  })

  it('brings a deleted task back with Undo and deletes it on the server only when the message closes', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/board?task=t-4')
    const drawer = await screen.findByRole('dialog', { name: 'Write sign-in error messages' })
    await user.click(await within(drawer).findByRole('button', { name: 'More actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete task' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete this task?' })).getByRole('button', { name: 'Delete task' }))
    await screen.findByText('“Write sign-in error messages” was deleted.', { selector: '[aria-live]' })
    expect(screen.queryByRole('button', { name: 'Write sign-in error messages' })).not.toBeInTheDocument()
    expect((await getTasks('p-khatet')).some((task) => task.id === 't-4')).toBe(true)

    await user.keyboard('{Control>}z{/Control}')
    expect(await screen.findByRole('button', { name: 'Write sign-in error messages' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Write sign-in error messages' }))
    const again = await screen.findByRole('dialog', { name: 'Write sign-in error messages' })
    await user.click(await within(again).findByRole('button', { name: 'More actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete task' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete this task?' })).getByRole('button', { name: 'Delete task' }))
    await user.click(await screen.findByRole('button', { name: 'Dismiss message' }))
    await waitFor(async () => expect((await getTasks('p-khatet')).some((task) => task.id === 't-4')).toBe(false))
    expect(screen.queryByRole('button', { name: 'Write sign-in error messages' })).not.toBeInTheDocument()
  })

  it('shows a view-only drawer to a member without edit access', async () => {
    signIn()
    renderApp('/projects/p-capstone/board?task=t-14')
    const drawer = await screen.findByRole('dialog', { name: 'Collect survey responses' })
    const tip = await within(drawer).findByRole('button', { name: 'About View only' })
    tip.focus()
    expect(await within(drawer).findByRole('tooltip')).toHaveTextContent('You can view this task but not change it')
    expect(within(drawer).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: 'Move to' })).not.toBeInTheDocument()
  })
})

describe('members (US-07, US-09, US-10)', () => {
  it('lets the owner change access and invite by username', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects/p-khatet/members')
    await user.click(await screen.findByRole('button', { name: 'Manage access for omar' }))
    const accessDialog = screen.getByRole('dialog', { name: /omar/ })
    await user.click(within(accessDialog).getByRole('radio', { name: /Edit all tasks/ }))
    await user.click(within(accessDialog).getByRole('button', { name: 'Save access' }))
    expect(await screen.findByText('omar now has Edit all tasks access.', { selector: '[aria-live]' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Invite member' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite a team member' })
    await user.type(within(dialog).getByLabelText(/Username/), 'ghost')
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))
    expect(await within(dialog).findByText('No user has the username ghost.')).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText(/Username/))
    await user.type(within(dialog).getByLabelText(/Username/), 'khalid')
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Invitation sent to khalid.', { selector: '[aria-live]' })).toBeInTheDocument()
  })

  it('shows a member the access levels without controls', async () => {
    signIn()
    renderApp('/projects/p-study/members')
    expect(await screen.findByText('saad')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Manage access/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Edit assigned tasks')).toHaveLength(2)
    expect(screen.getByText('Only the project owner can invite people or change access.')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })
})

describe('notifications (US-08, US-30)', () => {
  it('shows the unread count and accepts an invitation', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects')
    await user.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    const panel = screen.getByRole('dialog', { name: /Notifications/ })
    expect(await within(panel).findByText('ali invited you to join “Mobile App Study”.')).toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Earlier' })).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Accept' }))
    expect(await within(panel).findByText('You joined this project.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Mobile App Study.*Member/ })).toBeInTheDocument()
  })

  it('shows a pending invitation on Home and accepts it there', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects')
    const invitations = await screen.findByRole('region', { name: 'Invitations' })
    expect(within(invitations).getByText('ali invited you to Mobile App Study')).toBeInTheDocument()
    await user.click(within(invitations).getByRole('button', { name: 'Accept' }))
    expect(await screen.findByRole('link', { name: /Mobile App Study.*Member/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Invitations' })).not.toBeInTheDocument())
  })

  it('filters unread notifications and marks them all as read', async () => {
    signIn()
    const user = userEvent.setup()
    renderApp('/projects')
    await user.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    const panel = screen.getByRole('dialog', { name: /Notifications/ })
    await user.click(await within(panel).findByRole('button', { name: 'Unread, 2' }))
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2)
    await user.click(within(panel).getByRole('button', { name: 'Mark all as read' }))
    expect(await within(panel).findByText('No unread notifications')).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'View all' }))
    expect(within(panel).getAllByRole('listitem')).toHaveLength(3)
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })
})

describe('other pages', () => {
  it('shows a not-found message for a project the user is not in', async () => {
    signIn()
    renderApp('/projects/p-mobile/board')
    expect(await screen.findByText('This project does not exist or you are not a member of it.')).toBeInTheDocument()
  })

  it('shows a not-found page for an unknown address', async () => {
    signIn()
    renderApp('/nowhere')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
