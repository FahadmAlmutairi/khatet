import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('US-21: GET /api/projects/:projectId/tasks', () => {
  let owner, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    project = await createProject(owner)
  })
  afterAll(() => prisma.$disconnect())

  const getTasks = (as, projectId = project.id) =>
    request(app).get(`/api/projects/${projectId}/tasks`).set(authHeader(as))

  function createTask(title, status, position, assignees, extra = {}) {
    return prisma.task.create({
      data: {
        projectId: project.id,
        title,
        status,
        position,
        createdById: owner.id,
        assignees: { create: assignees.map((user) => ({ userId: user.id })) },
        ...extra,
      },
    })
  }

  async function addMember(username, taskAccess) {
    const user = await createUser(username)
    await prisma.projectMember.create({ data: { projectId: project.id, userId: user.id, taskAccess } })
    return user
  }

  it('answers an empty list for a project with no tasks', async () => {
    const res = await getTasks(owner)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('lists the tasks in board order: by status column, then position', async () => {
    await createTask('Done one', 'DONE', 1, [owner])
    await createTask('Second to do', 'TODO', 2, [owner])
    await createTask('Backlog idea', 'BACKLOG', 1, [owner])
    await createTask('First to do', 'TODO', 1, [owner])

    const res = await getTasks(owner)
    expect(res.body.map((task) => task.title)).toEqual(['Backlog idea', 'First to do', 'Second to do', 'Done one'])
  })

  it('returns the fields the board shows', async () => {
    const sara = await addMember('sara', 'EDIT_ASSIGNED')
    await createTask('Fix CSV errors', 'IN_PROGRESS', 1, [owner, sara], {
      description: 'Show which row failed.',
      priority: 'HIGH',
      dueDate: new Date('2026-10-19'),
      isBlocked: true,
      blockedReason: 'Waiting for sample file',
    })

    const [task] = (await getTasks(owner)).body
    expect(task).toMatchObject({
      projectId: project.id,
      title: 'Fix CSV errors',
      description: 'Show which row failed.',
      status: 'IN_PROGRESS',
      position: 1,
      priority: 'HIGH',
      dueDate: '2026-10-19',
      isBlocked: true,
      blockedReason: 'Waiting for sample file',
      createdById: owner.id,
    })
    expect(task.assigneeIds.sort()).toEqual([owner.id, sara.id].sort())
  })

  it('gives each access level the right permissions', async () => {
    const viewer = await addMember('viewer', 'VIEW_ONLY')
    const assignedOnly = await addMember('assigned_only', 'EDIT_ASSIGNED')
    const editor = await addMember('editor', 'EDIT_ALL')
    await createTask('Mine', 'TODO', 1, [assignedOnly])
    await createTask('Not mine', 'TODO', 2, [owner])

    const permissionsFor = async (user) =>
      Object.fromEntries((await getTasks(user)).body.map((task) => [task.title, task.permissions]))

    const all = { canEdit: true, canMove: true, canDelete: true }
    const none = { canEdit: false, canMove: false, canDelete: false }
    expect(await permissionsFor(owner)).toEqual({ Mine: all, 'Not mine': all })
    expect(await permissionsFor(editor)).toEqual({ Mine: all, 'Not mine': all })
    expect(await permissionsFor(assignedOnly)).toEqual({
      Mine: { canEdit: true, canMove: true, canDelete: false },
      'Not mine': none,
    })
    expect(await permissionsFor(viewer)).toEqual({ Mine: none, 'Not mine': none })
  })

  it('does not show tasks from other projects', async () => {
    const other = await createProject(owner)
    await prisma.task.create({ data: { projectId: other.id, title: 'Elsewhere', position: 1, createdById: owner.id } })
    expect((await getTasks(owner)).body).toEqual([])
  })

  it('answers not found to a non-member, an unknown project and a malformed ID', async () => {
    await createTask('Secret', 'TODO', 1, [owner])
    const outsider = await createUser('outsider')

    const res = await getTasks(outsider)
    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('This project does not exist or you are not a member of it.')
    expect((await getTasks(owner, randomUUID())).status).toBe(404)
    expect((await getTasks(owner, 'abc')).status).toBe(404)
  })

  it('refuses a request without sign-in', async () => {
    expect((await request(app).get(`/api/projects/${project.id}/tasks`)).status).toBe(401)
  })
})

describe.skipIf(!hasTestDatabase)('US-13: POST /api/projects/:projectId/tasks', () => {
  let owner, sara, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    project = await createProject(owner, [{ user: sara }])
  })
  afterAll(() => prisma.$disconnect())

  const createTask = (as, body, projectId = project.id) =>
    request(app).post(`/api/projects/${projectId}/tasks`).set(authHeader(as)).send(body)

  async function setAccess(user, taskAccess) {
    await prisma.projectMember.update({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      data: { taskAccess },
    })
  }

  it('creates a task in To Do with the given fields, and the board lists it', async () => {
    const res = await createTask(owner, {
      title: '  Write the test plan ',
      assigneeIds: [sara.id],
      description: 'Cover every access level.',
      priority: 'HIGH',
      dueDate: '2026-10-19',
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      projectId: project.id,
      title: 'Write the test plan',
      description: 'Cover every access level.',
      status: 'TODO',
      position: 1,
      priority: 'HIGH',
      dueDate: '2026-10-19',
      isBlocked: false,
      blockedReason: null,
      assigneeIds: [sara.id],
      createdById: owner.id,
      permissions: { canEdit: true, canMove: true, canDelete: true },
    })

    const board = await request(app).get(`/api/projects/${project.id}/tasks`).set(authHeader(sara))
    expect(board.body.map((task) => task.id)).toEqual([res.body.id])
  })

  it('needs only a title and an assignee; the other fields are empty', async () => {
    const res = await createTask(owner, { title: 'Quick task', assigneeIds: [owner.id], priority: '', dueDate: '' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ description: '', priority: null, dueDate: null })
  })

  it('puts each new task at the end of To Do', async () => {
    await prisma.task.create({
      data: { projectId: project.id, title: 'In progress', status: 'IN_PROGRESS', position: 7, createdById: owner.id },
    })
    const first = await createTask(owner, { title: 'One', assigneeIds: [owner.id] })
    const second = await createTask(owner, { title: 'Two', assigneeIds: [owner.id] })
    expect([first.body.position, second.body.position]).toEqual([1, 2])
  })

  it('gives tasks created at the same moment different positions', async () => {
    const results = await Promise.all(
      ['A', 'B', 'C', 'D'].map((title) => createTask(owner, { title, assigneeIds: [owner.id] })),
    )
    expect(results.map((res) => res.status)).toEqual([201, 201, 201, 201])
    expect(results.map((res) => res.body.position).sort()).toEqual([1, 2, 3, 4])
  })

  it('notifies each assignee except the creator', async () => {
    const res = await createTask(owner, { title: 'Shared task', assigneeIds: [owner.id, sara.id] })
    const notifications = await request(app).get('/api/notifications').set(authHeader(sara))
    expect(notifications.body.unreadCount).toBe(1)
    expect(notifications.body.items[0]).toMatchObject({
      type: 'TASK_ASSIGNED',
      taskId: res.body.id,
      taskTitle: 'Shared task',
      actorUsername: 'owner_user',
    })
    expect((await request(app).get('/api/notifications').set(authHeader(owner))).body.unreadCount).toBe(0)
  })

  it('explains each missing or wrong field', async () => {
    const res = await createTask(owner, { title: ' ', assigneeIds: [], priority: 'URGENT', dueDate: '2026-02-30' })
    expect(res.status).toBe(422)
    expect(res.body.error.fieldErrors).toEqual([
      { field: 'title', message: 'Enter a task title.' },
      { field: 'assigneeIds', message: 'Choose at least one assignee.' },
      { field: 'priority', message: 'Choose a priority.' },
      { field: 'dueDate', message: 'Enter a valid date.' },
    ])
    expect((await createTask(owner, { title: 'x'.repeat(201), assigneeIds: [owner.id] })).body.error.fieldErrors[0].message)
      .toBe('Keep the title under 200 characters.')
    expect(await prisma.task.count()).toBe(0)
  })

  it('refuses an assignee who is not a member of the project', async () => {
    const outsider = await createUser('outsider')
    for (const assigneeIds of [[outsider.id], [owner.id, outsider.id], ['abc']]) {
      const res = await createTask(owner, { title: 'Task', assigneeIds })
      expect(res.status).toBe(422)
      expect(res.body.error.fieldErrors[0]).toEqual({
        field: 'assigneeIds',
        message: 'Assignees must be members of this project.',
      })
    }
    expect(await prisma.task.count()).toBe(0)
  })

  it('lets a member with Edit all tasks create tasks', async () => {
    await setAccess(sara, 'EDIT_ALL')
    expect((await createTask(sara, { title: 'Mine', assigneeIds: [sara.id] })).status).toBe(201)
  })

  it('refuses members with Edit assigned tasks or View tasks only', async () => {
    for (const level of ['EDIT_ASSIGNED', 'VIEW_ONLY']) {
      await setAccess(sara, level)
      const res = await createTask(sara, { title: 'Mine', assigneeIds: [sara.id] })
      expect(res.status).toBe(403)
      expect(res.body.error.message).toBe('You need Edit all tasks access to create tasks.')
    }
    expect(await prisma.task.count()).toBe(0)
  })

  it('answers not found to a non-member or a malformed project ID', async () => {
    const outsider = await createUser('outsider')
    expect((await createTask(outsider, { title: 'Task', assigneeIds: [outsider.id] })).status).toBe(404)
    expect((await createTask(owner, { title: 'Task', assigneeIds: [owner.id] }, 'abc')).status).toBe(404)
  })
})

describe.skipIf(!hasTestDatabase)('US-14 to US-18: one task', () => {
  let owner, sara, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    project = await createProject(owner, [{ user: sara }])
  })
  afterAll(() => prisma.$disconnect())

  function createTask(title, status, position, assignees = [owner], extra = {}) {
    return prisma.task.create({
      data: {
        projectId: project.id,
        title,
        status,
        position,
        createdById: owner.id,
        assignees: { create: assignees.map((user) => ({ userId: user.id })) },
        ...extra,
      },
    })
  }

  const move = (as, taskId, body) => request(app).post(`/api/tasks/${taskId}/move`).set(authHeader(as)).send(body)
  const board = async () =>
    (await prisma.task.findMany({ where: { projectId: project.id }, orderBy: [{ status: 'asc' }, { position: 'asc' }] })).map(
      (task) => `${task.status}:${task.position}:${task.title}`,
    )

  it('opens a task for a member and answers not found to anyone else', async () => {
    const task = await createTask('Write report', 'TODO', 1)
    const res = await request(app).get(`/api/tasks/${task.id}`).set(authHeader(sara))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: task.id, title: 'Write report', permissions: { canEdit: false } })

    const outsider = await createUser('outsider')
    const hidden = await request(app).get(`/api/tasks/${task.id}`).set(authHeader(outsider))
    expect(hidden.status).toBe(404)
    expect(hidden.body.error.message).toBe('This task no longer exists. It may have been deleted.')
    expect((await request(app).get(`/api/tasks/${randomUUID()}`).set(authHeader(owner))).status).toBe(404)
    expect((await request(app).get('/api/tasks/abc').set(authHeader(owner))).status).toBe(404)
  })

  it('moves a task to another column and shifts the other cards', async () => {
    const a = await createTask('A', 'TODO', 1)
    await createTask('B', 'TODO', 2)
    await createTask('C', 'IN_PROGRESS', 1)

    const res = await move(owner, a.id, { status: 'IN_PROGRESS', position: 1 })
    expect(res.status).toBe(200)
    expect(res.body.map((task) => `${task.status}:${task.position}:${task.title}`)).toEqual([
      'TODO:1:B',
      'IN_PROGRESS:1:A',
      'IN_PROGRESS:2:C',
    ])
    expect(await board()).toEqual(['TODO:1:B', 'IN_PROGRESS:1:A', 'IN_PROGRESS:2:C'])
  })

  it('reorders within a column and clears the blocked flag when a task leaves In Progress', async () => {
    const a = await createTask('A', 'IN_PROGRESS', 1, [owner], { isBlocked: true, blockedReason: 'Waiting' })
    await createTask('B', 'IN_PROGRESS', 2)

    await move(owner, a.id, { status: 'IN_PROGRESS', position: 2 })
    expect(await board()).toEqual(['IN_PROGRESS:1:B', 'IN_PROGRESS:2:A'])
    expect(await prisma.task.findUnique({ where: { id: a.id } })).toMatchObject({ isBlocked: true })

    await move(owner, a.id, { status: 'DONE', position: 1 })
    expect(await prisma.task.findUnique({ where: { id: a.id } })).toMatchObject({ isBlocked: false, blockedReason: null })
  })

  it('lets an Edit assigned member move only their own tasks, and checks the status', async () => {
    const mine = await createTask('Mine', 'TODO', 1, [sara])
    const theirs = await createTask('Theirs', 'TODO', 2, [owner])
    expect((await move(sara, mine.id, { status: 'DONE', position: 1 })).status).toBe(200)
    expect((await move(sara, theirs.id, { status: 'DONE', position: 1 })).status).toBe(403)
    expect((await move(owner, theirs.id, { status: 'LATER', position: 1 })).status).toBe(422)
  })

  it('edits the fields that were sent and notifies new assignees', async () => {
    const task = await createTask('Old title', 'IN_PROGRESS', 1)
    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(authHeader(owner))
      .send({ title: 'New title', assigneeIds: [owner.id, sara.id], isBlocked: true, blockedReason: ' Waiting ' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ title: 'New title', isBlocked: true, blockedReason: 'Waiting' })
    expect(res.body.assigneeIds.sort()).toEqual([owner.id, sara.id].sort())
    expect(await prisma.notification.count({ where: { userId: sara.id, taskId: task.id } })).toBe(1)

    const bad = await request(app).patch(`/api/tasks/${task.id}`).set(authHeader(owner)).send({ title: ' ' })
    expect(bad.status).toBe(422)
    expect((await request(app).patch(`/api/tasks/${task.id}`).set(authHeader(sara)).send({ title: 'X' })).status).toBe(200)
  })

  it('refuses to flag a task outside In Progress as blocked', async () => {
    const task = await createTask('Todo', 'TODO', 1)
    const res = await request(app).patch(`/api/tasks/${task.id}`).set(authHeader(owner)).send({ isBlocked: true })
    expect(res.status).toBe(422)
    expect(res.body.error.fieldErrors[0].field).toBe('isBlocked')
  })

  it('deletes a task for the owner, renumbers the column, and refuses an Edit assigned member', async () => {
    const a = await createTask('A', 'TODO', 1, [sara])
    await createTask('B', 'TODO', 2)
    expect((await request(app).delete(`/api/tasks/${a.id}`).set(authHeader(sara))).status).toBe(403)

    const res = await request(app).delete(`/api/tasks/${a.id}`).set(authHeader(owner))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: a.id })
    expect(await board()).toEqual(['TODO:1:B'])
    expect((await request(app).delete(`/api/tasks/${a.id}`).set(authHeader(owner))).status).toBe(404)
  })
})
