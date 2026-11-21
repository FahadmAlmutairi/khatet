// US-27: DELETE /api/projects/:projectId (owner only): delete everything now, without archiving.
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('US-27: delete a project', () => {
  let owner, sara, newcomer, outsider, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    newcomer = await createUser('newcomer')
    outsider = await createUser('outsider')
    project = await createProject(owner, [{ user: sara, taskAccess: 'EDIT_ALL' }])
  })
  afterAll(() => prisma.$disconnect())

  const remove = (as, id = project.id) => request(app).delete(`/api/projects/${id}`).set(authHeader(as))
  const listIds = async (as) => (await request(app).get('/api/projects').set(authHeader(as))).body.map((p) => p.id)

  // Fills the project the way real use does: a task through the API (which also adds the
  // assignment notification and an activity event), plus a chat message, a pending
  // invitation with its notification, and an AI report.
  async function fillProject() {
    const task = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(authHeader(owner))
      .send({ title: 'Write the report', assigneeIds: [sara.id] })
    expect(task.status).toBe(201)
    await prisma.chatMessage.create({ data: { projectId: project.id, authorId: sara.id, text: 'Hello team' } })
    const invitation = await prisma.invitation.create({
      data: { projectId: project.id, invitedUserId: newcomer.id, invitedById: owner.id },
    })
    await prisma.notification.create({
      data: { userId: newcomer.id, type: 'INVITATION', projectId: project.id, actorId: owner.id, invitationId: invitation.id },
    })
    await prisma.aiReport.create({
      data: { projectId: project.id, createdById: owner.id, content: '## Progress summary', model: 'test-model', promptVersion: 2 },
    })
  }

  const countsFor = async (projectId) => {
    const where = { projectId }
    return {
      members: await prisma.projectMember.count({ where }),
      invitations: await prisma.invitation.count({ where }),
      tasks: await prisma.task.count({ where }),
      assignees: await prisma.taskAssignee.count({ where: { task: { projectId } } }),
      messages: await prisma.chatMessage.count({ where }),
      notifications: await prisma.notification.count({ where }),
      activity: await prisma.activityEvent.count({ where }),
      reports: await prisma.aiReport.count({ where }),
    }
  }

  it('lets the owner delete the project with everything in it', async () => {
    await fillProject()
    const before = await countsFor(project.id)
    expect(Object.values(before).every((count) => count > 0)).toBe(true)

    const res = await remove(owner)
    expect(res.status).toBe(204)

    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull()
    expect(await countsFor(project.id)).toEqual({
      members: 0, invitations: 0, tasks: 0, assignees: 0, messages: 0, notifications: 0, activity: 0, reports: 0,
    })
    // The people themselves stay.
    expect(await prisma.user.count({ where: { id: { in: [owner.id, sara.id, newcomer.id] } } })).toBe(3)
  })

  it('removes the project from every member’s list, and later requests answer 404', async () => {
    expect(await listIds(sara)).toEqual([project.id])

    await remove(owner).expect(204)

    expect(await listIds(owner)).toEqual([])
    expect(await listIds(sara)).toEqual([])
    for (const as of [owner, sara]) {
      const res = await request(app).get(`/api/projects/${project.id}`).set(authHeader(as))
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    }
    const tasks = await request(app).get(`/api/projects/${project.id}/tasks`).set(authHeader(sara))
    expect(tasks.status).toBe(404)
  })

  it('refuses members (403) and non-members (404), and keeps the project', async () => {
    const asMember = await remove(sara)
    expect(asMember.status).toBe(403)
    expect(asMember.body.error.code).toBe('FORBIDDEN')

    const asOutsider = await remove(outsider)
    expect(asOutsider.status).toBe(404)
    expect(asOutsider.body.error.code).toBe('NOT_FOUND')

    expect(await prisma.project.count({ where: { id: project.id } })).toBe(1)
    expect(await listIds(sara)).toEqual([project.id])
  })

  it('answers 404 for an unknown or malformed project ID, and after the project is gone', async () => {
    expect((await remove(owner, '00000000-0000-4000-8000-000000000000')).status).toBe(404)
    expect((await remove(owner, 'not-a-uuid')).status).toBe(404)

    await remove(owner).expect(204)
    expect((await remove(owner)).status).toBe(404)
  })

  it('leaves the owner’s other projects alone', async () => {
    const other = await createProject(owner, [{ user: sara }])
    await prisma.task.create({
      data: { projectId: other.id, title: 'Keep me', status: 'TODO', position: 1, createdById: owner.id },
    })

    await remove(owner).expect(204)

    expect(await listIds(owner)).toEqual([other.id])
    expect(await prisma.task.count({ where: { projectId: other.id } })).toBe(1)
  })

  it('answers 410 for an archived project, which is deleted under Archived projects instead', async () => {
    await request(app).post(`/api/projects/${project.id}/archive`).set(authHeader(owner)).expect(200)

    const res = await remove(owner)
    expect(res.status).toBe(410)
    expect(res.body.error.code).toBe('PROJECT_ARCHIVED')
    expect(await prisma.project.count({ where: { id: project.id } })).toBe(1)
  })

  it('refuses a request without sign-in', async () => {
    const res = await request(app).delete(`/api/projects/${project.id}`)
    expect(res.status).toBe(401)
    expect(await prisma.project.count({ where: { id: project.id } })).toBe(1)
  })
})
