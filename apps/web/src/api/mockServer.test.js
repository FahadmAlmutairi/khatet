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

  it('lets the owner remove a team member and blocks non-owner removal', async () => {
    await expect(api.removeMember('p-khatet', 'u-omar')).resolves.toEqual({
      projectId: 'p-khatet',
      userId: 'u-omar',
    })
    await expect(api.getMembers('p-khatet')).resolves.toMatchObject({
      members: expect.not.arrayContaining([expect.objectContaining({ userId: 'u-omar' })]),
    })
    await expect(api.removeMember('p-study', 'u-omar')).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(api.removeMember('p-khatet', 'u-fahad')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('lets a team member leave a project but not the owner', async () => {
    await expect(api.leaveProject('p-study')).resolves.toEqual({ projectId: 'p-study', userId: 'u-fahad' })
    await expect(api.getProjects()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'p-study' })]),
    )
    await expect(api.leaveProject('p-khatet')).rejects.toMatchObject({ code: 'FORBIDDEN' })
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

  it('lets the owner update a project name and description', async () => {
    const project = await api.updateProject('p-khatet', { name: '  Khatet  ', description: '  A shared workspace  ' })
    expect(project).toMatchObject({ name: 'Khatet', description: 'A shared workspace', role: 'OWNER' })
    await expect(api.getProject('p-khatet')).resolves.toMatchObject({
      name: 'Khatet',
      description: 'A shared workspace',
    })
  })

  it('requires a project owner and a non-empty name to update settings', async () => {
    await expect(api.updateProject('p-study', { name: 'Changed' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(api.updateProject('p-khatet', { name: '  ' })).rejects.toMatchObject({
      fieldErrors: [{ field: 'name', message: 'Enter a project name.' }],
    })
  })

  it('adds a user who accepts an invitation with Edit assigned tasks access', async () => {
    await api.acceptInvitation('inv-mobile-fahad')
    const projects = await api.getProjects()
    expect(projects.find((project) => project.id === 'p-mobile')).toMatchObject({ role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED' })
  })

  it('refuses an invitation to someone who is already a member', async () => {
    await expect(api.inviteMember('p-khatet', '@saad')).rejects.toMatchObject({
      fieldErrors: [{ field: 'username', message: 'saad cannot be invited. Check the spelling. Members and people already invited are not invited again.' }],
    })
  })
})

describe('sample API: CSV import (US-33)', () => {
  beforeEach(() => api.resetMockServer({ signedInAs: 'u-fahad' }))

  const csv = 'Task,Stage,Assigned to\nWrite the README,Done,saad\nCheck the footer,,\n,To do,\nPlan the demo,Later,ghost\n'
  const mapping = ['title', 'status', 'assignees']

  it('answers the columns, a suggested match and sample rows, and saves nothing', async () => {
    const before = (await api.getTasks('p-khatet')).length
    const preview = await api.previewImport('p-khatet', { csv })
    expect(preview).toEqual({
      columns: ['Task', 'Stage', 'Assigned to'],
      suggestedMapping: mapping,
      rowCount: 4,
      sample: [
        ['Write the README', 'Done', 'saad'],
        ['Check the footer', '', ''],
        ['', 'To do', ''],
      ],
    })
    expect((await api.getTasks('p-khatet')).length).toBe(before)
  })

  it('checks every row against the mapping', async () => {
    const preview = await api.previewImport('p-khatet', { csv, mapping })
    expect(preview).toMatchObject({ validCount: 2, skippedCount: 2 })
    expect(preview.rows[0]).toEqual({
      line: 2,
      values: { title: 'Write the README', description: '', status: 'DONE', priority: null, dueDate: null, assignees: ['saad'] },
      errors: [],
    })
    expect(preview.rows[3].errors.map((error) => error.field)).toEqual(['status', 'assignees'])
    await expect(api.previewImport('p-khatet', { csv, mapping: [null, 'status', null] })).rejects.toMatchObject({
      fieldErrors: [{ field: 'mapping', message: 'Choose the column that holds the task title.' }],
    })
  })

  it('creates only the valid rows at the end of their columns', async () => {
    const result = await api.confirmImport('p-khatet', { csv, mapping })
    expect(result).toMatchObject({ createdCount: 2, skippedCount: 2 })
    const tasks = await api.getTasks('p-khatet')
    const readme = tasks.find((task) => task.title === 'Write the README')
    expect(readme).toMatchObject({ status: 'DONE', assigneeIds: ['u-saad'] })
    expect(readme.position).toBe(tasks.filter((task) => task.status === 'DONE').length)
    expect(tasks.find((task) => task.title === 'Check the footer')).toMatchObject({ status: 'TODO', assigneeIds: ['u-fahad'] })
    const { events } = await api.getActivity('p-khatet', { kind: 'task' })
    expect(events[0].details.imported).toBe(true)
  })

  it('lets only the owner import, and explains an unreadable file', async () => {
    await expect(api.previewImport('p-khatet', { csv: 'Title\n' })).rejects.toMatchObject({
      fieldErrors: [{ field: 'csv', message: 'The file has a header line but no rows.' }],
    })
    api.resetMockServer({ signedInAs: 'u-saad' })
    await expect(api.previewImport('p-khatet', { csv })).rejects.toMatchObject({ status: 403 })
  })
})
