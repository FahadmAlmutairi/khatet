import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('Project log: GET /api/projects/:projectId/activity', () => {
  let owner, sara, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    project = await createProject(owner, [{ user: sara, taskAccess: 'EDIT_ALL' }])
  })
  afterAll(() => prisma.$disconnect())

  const getLog = (as, query = '') => request(app).get(`/api/projects/${project.id}/activity${query}`).set(authHeader(as))
  const createTask = (as, body) =>
    request(app).post(`/api/projects/${project.id}/tasks`).set(authHeader(as)).send(body)

  it('records who created, edited, moved and deleted a task, newest first', async () => {
    const created = await createTask(sara, { title: 'Write tests', assigneeIds: [sara.id], priority: 'LOW' })
    const taskId = created.body.id
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set(authHeader(sara))
      .send({ title: 'Write API tests', priority: 'HIGH', assigneeIds: [owner.id], description: 'All routes' })
    await request(app).post(`/api/tasks/${taskId}/move`).set(authHeader(sara)).send({ status: 'IN_PROGRESS' })
    await request(app).post(`/api/tasks/${taskId}/move`).set(authHeader(sara)).send({ status: 'IN_PROGRESS', position: 1 })
    await request(app).delete(`/api/tasks/${taskId}`).set(authHeader(owner))

    const res = await getLog(owner)
    expect(res.status).toBe(200)
    expect(res.body.events.map((event) => event.type)).toEqual(['TASK_DELETED', 'TASK_MOVED', 'TASK_UPDATED', 'TASK_CREATED'])

    const [deleted, moved, updated, createdEvent] = res.body.events
    expect(deleted).toMatchObject({ actorUsername: 'owner_user', taskId, taskTitle: 'Write API tests' })
    expect(moved.details).toEqual({ from: 'TODO', to: 'IN_PROGRESS' })
    expect(updated.details.changes).toEqual([
      { field: 'title', from: 'Write tests', to: 'Write API tests' },
      { field: 'priority', from: 'LOW', to: 'HIGH' },
      { field: 'description' },
      { field: 'assignees', added: ['owner_user'], removed: ['sara'] },
    ])
    expect(createdEvent).toMatchObject({ actorId: sara.id, actorUsername: 'sara', details: { status: 'TODO', assignees: ['sara'] } })
  })

  it('keeps a member’s history after they leave, and filters by person', async () => {
    await createTask(sara, { title: 'Draft the report', assigneeIds: [owner.id] })
    await request(app).post(`/api/projects/${project.id}/leave`).set(authHeader(sara)).expect(200)
    await createTask(owner, { title: 'Owner task', assigneeIds: [owner.id] })

    const res = await getLog(owner, `?actorId=${sara.id}`)
    expect(res.body.events.map((event) => [event.type, event.taskTitle])).toEqual([
      ['MEMBER_LEFT', null],
      ['TASK_CREATED', 'Draft the report'],
    ])
    expect(res.body.actors).toEqual([
      { id: owner.id, username: 'owner_user' },
      { id: sara.id, username: 'sara' },
    ])
  })

  it('records invitations, joining, access changes and removal', async () => {
    const nora = await createUser('nora')
    const invite = await request(app)
      .post(`/api/projects/${project.id}/invitations`)
      .set(authHeader(owner))
      .send({ username: 'nora' })
    await request(app).post(`/api/invitations/${invite.body.id}/accept`).set(authHeader(nora)).expect(200)
    await request(app)
      .patch(`/api/projects/${project.id}/members/${nora.id}`)
      .set(authHeader(owner))
      .send({ taskAccess: 'VIEW_ONLY' })
      .expect(200)
    await request(app).delete(`/api/projects/${project.id}/members/${nora.id}`).set(authHeader(owner)).expect(200)

    const res = await getLog(sara)
    expect(res.body.events.map((event) => [event.type, event.actorUsername, event.details])).toEqual([
      ['MEMBER_REMOVED', 'owner_user', { userId: nora.id, username: 'nora' }],
      ['MEMBER_ACCESS_CHANGED', 'owner_user', { userId: nora.id, username: 'nora', from: 'EDIT_ASSIGNED', to: 'VIEW_ONLY' }],
      ['MEMBER_JOINED', 'nora', {}],
      ['MEMBER_INVITED', 'owner_user', { userId: nora.id, username: 'nora' }],
    ])
  })

  it('records project creation and settings changes', async () => {
    const created = await request(app).post('/api/projects').set(authHeader(owner)).send({ name: 'Capstone' })
    await request(app).patch(`/api/projects/${created.body.id}`).set(authHeader(owner)).send({ name: 'Capstone 2' })

    const res = await request(app).get(`/api/projects/${created.body.id}/activity`).set(authHeader(owner))
    expect(res.body.events.map((event) => [event.type, event.details])).toEqual([
      ['PROJECT_UPDATED', { changes: [{ field: 'name', from: 'Capstone', to: 'Capstone 2' }] }],
      ['PROJECT_CREATED', { name: 'Capstone' }],
    ])
  })

  it('pages with nextCursor', async () => {
    for (const title of ['One', 'Two', 'Three']) await createTask(owner, { title, assigneeIds: [owner.id] })

    const first = await getLog(owner, '?limit=2')
    expect(first.body.events.map((event) => event.taskTitle)).toEqual(['Three', 'Two'])
    expect(first.body.nextCursor).toBe(first.body.events[1].id)

    const second = await getLog(owner, `?limit=2&before=${first.body.nextCursor}`)
    expect(second.body.events.map((event) => event.taskTitle)).toEqual(['One'])
    expect(second.body.nextCursor).toBeNull()
  })

  it('does not log a failed change', async () => {
    await createTask(sara, { title: '', assigneeIds: [sara.id] }).expect(422)
    expect((await getLog(owner)).body.events).toEqual([])
  })

  it('is only for members of the project', async () => {
    const stranger = await createUser('stranger')
    expect((await getLog(stranger)).status).toBe(404)
    expect((await getLog(owner, '?limit=500')).status).toBe(422)
    expect((await getLog(owner, '?actorId=nope')).status).toBe(422)
    const unknown = await request(app).get(`/api/projects/${randomUUID()}/activity`).set(authHeader(owner))
    expect(unknown.status).toBe(404)
  })
})
