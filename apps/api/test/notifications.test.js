import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { notifyAssigned } from '../src/notifications/routes.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('US-30: notifications', () => {
  let owner, sara, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    project = await createProject(owner, [{ user: sara }])
  })
  afterAll(() => prisma.$disconnect())

  async function createTask(title = 'Write the test plan') {
    return prisma.task.create({ data: { projectId: project.id, title, position: 1, createdById: owner.id } })
  }

  it('lists only my notifications, newest first, with the unread count', async () => {
    const task = await createTask()
    await prisma.notification.create({
      data: { userId: sara.id, type: 'TASK_ASSIGNED', projectId: project.id, taskId: task.id, actorId: owner.id, createdAt: new Date('2026-10-01') },
    })
    await prisma.notification.create({
      data: { userId: sara.id, type: 'TASK_ASSIGNED', projectId: project.id, taskId: task.id, actorId: owner.id, read: true, createdAt: new Date('2026-10-02') },
    })
    await prisma.notification.create({
      data: { userId: owner.id, type: 'TASK_ASSIGNED', projectId: project.id, taskId: task.id },
    })

    const res = await request(app).get('/api/notifications').set(authHeader(sara))
    expect(res.status).toBe(200)
    expect(res.body.unreadCount).toBe(1)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.items[0].read).toBe(true) // 2 October, the newer one
    expect(res.body.items[1]).toMatchObject({
      type: 'TASK_ASSIGNED',
      taskTitle: 'Write the test plan',
      projectName: 'Graduation project',
      actorUsername: 'owner_user',
      invitationStatus: null,
    })
  })

  it('shows an empty list to a user with no notifications', async () => {
    const res = await request(app).get('/api/notifications').set(authHeader(owner))
    expect(res.body).toEqual({ items: [], unreadCount: 0 })
  })

  it('marks one of my notifications as read', async () => {
    const notification = await prisma.notification.create({
      data: { userId: sara.id, type: 'INVITATION', projectId: project.id },
    })
    const res = await request(app).patch(`/api/notifications/${notification.id}`).set(authHeader(sara)).send({ read: true })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: notification.id, read: true })
    expect((await request(app).get('/api/notifications').set(authHeader(sara))).body.unreadCount).toBe(0)
  })

  it("does not let a user mark someone else's notification", async () => {
    const notification = await prisma.notification.create({
      data: { userId: sara.id, type: 'INVITATION', projectId: project.id },
    })
    const res = await request(app).patch(`/api/notifications/${notification.id}`).set(authHeader(owner))
    expect(res.status).toBe(404)
    expect((await prisma.notification.findUnique({ where: { id: notification.id } })).read).toBe(false)
  })

  it('answers not found to an unknown or malformed notification ID', async () => {
    expect((await request(app).patch(`/api/notifications/${randomUUID()}`).set(authHeader(sara))).status).toBe(404)
    expect((await request(app).patch('/api/notifications/abc').set(authHeader(sara))).status).toBe(404)
  })

  it('refuses a request without sign-in', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401)
  })

  it('notifyAssigned notifies each new assignee except the person assigning', async () => {
    const task = await createTask()
    await prisma.$transaction((tx) => notifyAssigned(tx, { task, userIds: [sara.id, owner.id], actorId: owner.id }))

    const notifications = await prisma.notification.findMany()
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({ userId: sara.id, type: 'TASK_ASSIGNED', taskId: task.id, actorId: owner.id })
  })
})
