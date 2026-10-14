import { beforeEach, describe, expect, it } from 'vitest'
import { applyMove } from './hooks.js'
import * as api from './mockServer.js'

function column(tasks, status) {
  return tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position)
    .map((task) => [task.id, task.position])
}

describe('sample API', () => {
  beforeEach(() => api.resetMockServer({ signedInAs: 'u-fahad' }))

  it('moves a task and renumbers both columns with whole numbers', async () => {
    const tasks = await api.moveTask('t-3', { status: 'IN_PROGRESS', position: 1 })
    expect(column(tasks, 'IN_PROGRESS')).toEqual([
      ['t-3', 1],
      ['t-6', 2],
      ['t-7', 3],
    ])
    expect(column(tasks, 'TODO')).toEqual([
      ['t-4', 1],
      ['t-5', 2],
    ])
  })

  it('clears the blocked flag when a task leaves In Progress', async () => {
    const tasks = await api.moveTask('t-6', { status: 'BACKLOG' })
    const task = tasks.find((item) => item.id === 't-6')
    expect(task).toMatchObject({ isBlocked: false, blockedReason: null, assigneeIds: ['u-fahad'], priority: 'HIGH' })
  })

  it('applies the same move rule in the browser cache', async () => {
    const before = await api.getTasks('p-khatet')
    const server = await api.moveTask('t-8', { status: 'TODO', position: 2 })
    const local = applyMove(before, 't-8', 'TODO', 2)
    for (const status of ['TODO', 'READY_FOR_REVIEW']) {
      expect(column(local, status)).toEqual(column(server, status))
    }
  })

  it('requires a title and at least one assignee for a new task', async () => {
    await expect(api.createTask('p-khatet', { title: ' ', assigneeIds: [] })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: [
        { field: 'title', message: 'Enter a task title.' },
        { field: 'assigneeIds', message: 'Choose at least one assignee.' },
      ],
    })
  })

  it('starts a new task in To Do at the end of the column', async () => {
    const task = await api.createTask('p-khatet', { title: 'Write tests', assigneeIds: ['u-saad'] })
    expect(task).toMatchObject({ status: 'TODO', position: 4 })
  })

  it('lets Edit assigned tasks members change only their own tasks', async () => {
    const tasks = await api.getTasks('p-study')
    expect(tasks.find((task) => task.id === 't-11').permissions).toEqual({ canEdit: true, canMove: true, canDelete: false })
    expect(tasks.find((task) => task.id === 't-12').permissions).toEqual({ canEdit: false, canMove: false, canDelete: false })
    await expect(api.moveTask('t-12', { status: 'DONE' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('keeps at least one assignee on a task', async () => {
    await expect(api.updateTask('t-8', { assigneeIds: [] })).rejects.toMatchObject({
      fieldErrors: [{ field: 'assigneeIds', message: 'Choose at least one assignee.' }],
    })
  })

  it('only flags tasks in progress as blocked', async () => {
    await expect(api.updateTask('t-3', { isBlocked: true })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    const task = await api.updateTask('t-7', { isBlocked: true, blockedReason: '  Waiting for review ' })
    expect(task).toMatchObject({ status: 'IN_PROGRESS', isBlocked: true, blockedReason: 'Waiting for review' })
  })

  it('hides projects the user does not belong to', async () => {
    await expect(api.getTasks('p-mobile')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('adds a user who accepts an invitation with Edit assigned tasks access', async () => {
    await api.acceptInvitation('inv-mobile-fahad')
    const projects = await api.getProjects()
    expect(projects.find((project) => project.id === 'p-mobile')).toMatchObject({ role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED' })
  })

  it('refuses an invitation to someone who is already a member', async () => {
    await expect(api.inviteMember('p-khatet', '@saad')).rejects.toMatchObject({
      fieldErrors: [{ field: 'username', message: 'saad is already a member of this project.' }],
    })
  })
})
