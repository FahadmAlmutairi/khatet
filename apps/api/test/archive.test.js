import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('Archived projects', () => {
  let owner, sara, omar, project, taskId

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    omar = await createUser('omar')
    project = await createProject(owner, [{ user: sara, taskAccess: 'EDIT_ALL' }])
    const created = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(authHeader(sara))
      .send({ title: 'Write tests', assigneeIds: [sara.id] })
    taskId = created.body.id
    await request(app).post(`/api/tasks/${taskId}/move`).set(authHeader(sara)).send({ status: 'DONE' })
  })
  afterAll(() => prisma.$disconnect())

  const archive = (as) => request(app).post(`/api/projects/${project.id}/archive`).set(authHeader(as))
  const listArchived = (as) => request(app).get('/api/archived-projects').set(authHeader(as))
  const deleteArchived = (as) => request(app).delete(`/api/archived-projects/${project.id}`).set(authHeader(as))
  const getLog = (as) => request(app).get(`/api/projects/${project.id}/activity`).set(authHeader(as))

  it('lets only the owner archive', async () => {
    expect((await archive(sara)).status).toBe(403)
    expect((await archive(omar)).status).toBe(404)
    const res = await archive(owner)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: project.id, name: 'Graduation project', archivedByUsername: 'owner_user' })
    expect(res.body.summary.members.map((member) => member.username)).toEqual(['owner_user', 'sara'])
    expect(res.body.summary.tasks).toEqual({
      total: 1,
      byStatus: { BACKLOG: 0, TODO: 0, IN_PROGRESS: 0, READY_FOR_REVIEW: 0, DONE: 1 },
    })
    expect((await archive(owner)).status).toBe(410)
  })

  it('closes the board, chat, members and settings but keeps the log readable', async () => {
    await archive(owner)

    const projects = await request(app).get('/api/projects').set(authHeader(sara))
    expect(projects.body).toEqual([])

    const closed = [
      request(app).get(`/api/projects/${project.id}`).set(authHeader(sara)),
      request(app).get(`/api/projects/${project.id}/tasks`).set(authHeader(sara)),
      request(app).get(`/api/tasks/${taskId}`).set(authHeader(sara)),
      request(app).post(`/api/tasks/${taskId}/move`).set(authHeader(sara)).send({ status: 'TODO' }),
      request(app).get(`/api/projects/${project.id}/messages`).set(authHeader(sara)),
      request(app).post(`/api/projects/${project.id}/leave`).set(authHeader(sara)),
      request(app).patch(`/api/projects/${project.id}`).set(authHeader(owner)).send({ name: 'New' }),
      request(app).post(`/api/projects/${project.id}/invitations`).set(authHeader(owner)).send({ username: 'omar' }),
    ]
    for (const res of await Promise.all(closed)) {
      expect(res.status).toBe(410)
      expect(res.body.error.code).toBe('PROJECT_ARCHIVED')
    }

    const log = await getLog(sara)
    expect(log.status).toBe(200)
    expect(log.body.events.map((event) => event.type)).toEqual(['PROJECT_ARCHIVED', 'TASK_MOVED', 'TASK_CREATED'])
    expect(log.body.events[0]).toMatchObject({ actorUsername: 'owner_user', details: { name: 'Graduation project' } })
    expect((await getLog(omar)).status).toBe(404)
  })

  it('removes pending invitations and the project notifications', async () => {
    await request(app).post(`/api/projects/${project.id}/invitations`).set(authHeader(owner)).send({ username: 'omar' })
    await archive(owner)
    expect(await prisma.invitation.count({ where: { projectId: project.id } })).toBe(0)
    expect(await prisma.notification.count({ where: { projectId: project.id } })).toBe(0)
  })

  it('lists archived projects for each member', async () => {
    await archive(owner)
    for (const member of [owner, sara]) {
      const res = await listArchived(member)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ id: project.id, name: 'Graduation project' })
    }
    expect((await listArchived(omar)).body).toEqual([])
    expect((await request(app).get(`/api/archived-projects/${project.id}`).set(authHeader(sara))).status).toBe(200)
    expect((await request(app).get(`/api/archived-projects/${project.id}`).set(authHeader(omar))).status).toBe(404)
  })

  it('does not list a project that is not archived', async () => {
    expect((await listArchived(owner)).body).toEqual([])
    expect((await deleteArchived(owner)).status).toBe(404)
    expect((await request(app).delete(`/api/archived-projects/${randomUUID()}`).set(authHeader(owner))).status).toBe(404)
    expect((await request(app).delete('/api/archived-projects/nope').set(authHeader(owner))).status).toBe(404)
  })

  it('deletes the log only for the member who asks, until the last one does', async () => {
    await archive(owner)

    expect((await deleteArchived(sara)).status).toBe(204)
    expect((await listArchived(sara)).body).toEqual([])
    expect((await getLog(sara)).status).toBe(404)
    expect((await deleteArchived(sara)).status).toBe(404)

    // The owner still has it.
    expect((await listArchived(owner)).body).toHaveLength(1)
    expect((await getLog(owner)).body.events.length).toBe(3)

    expect((await deleteArchived(owner)).status).toBe(204)
    expect(await prisma.project.count({ where: { id: project.id } })).toBe(0)
    expect(await prisma.activityEvent.count({ where: { projectId: project.id } })).toBe(0)
    expect(await prisma.task.count({ where: { projectId: project.id } })).toBe(0)
  })

  it('keeps entries by a member who left before the archive', async () => {
    await request(app).post(`/api/tasks/${taskId}/move`).set(authHeader(owner)).send({ status: 'TODO' })
    await request(app).patch(`/api/tasks/${taskId}`).set(authHeader(owner)).send({ assigneeIds: [owner.id] })
    expect((await request(app).post(`/api/projects/${project.id}/leave`).set(authHeader(sara))).status).toBe(200)
    await archive(owner)

    const log = await getLog(owner)
    expect(log.body.events.filter((event) => event.actorUsername === 'sara').map((event) => event.type)).toEqual([
      'MEMBER_LEFT',
      'TASK_MOVED',
      'TASK_CREATED',
    ])
    // Sara left before the archive, so she does not get it.
    expect((await listArchived(sara)).body).toEqual([])
  })
})
