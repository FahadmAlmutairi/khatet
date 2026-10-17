import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } from './helpers.js'

describe.skipIf(!hasTestDatabase)('members and invitations', () => {
  let owner, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    project = await createProject(owner)
  })
  afterAll(() => prisma.$disconnect())

  const invite = (as, username, projectId = project.id) =>
    request(app).post(`/api/projects/${projectId}/invitations`).set(authHeader(as)).send({ username })
  const answer = (as, invitationId, action) =>
    request(app).post(`/api/invitations/${invitationId}/${action}`).set(authHeader(as))

  describe('US-09: GET /api/projects/:projectId/members', () => {
    it('lists the owner first, then members by username, and shows the owner pending invitations', async () => {
      const zed = await createUser('zed')
      const amal = await createUser('amal')
      await prisma.projectMember.createMany({
        data: [zed, amal].map((user) => ({ projectId: project.id, userId: user.id })),
      })
      await createUser('waiting')
      await invite(owner, 'waiting')

      const res = await request(app).get(`/api/projects/${project.id}/members`).set(authHeader(owner))
      expect(res.status).toBe(200)
      expect(res.body.members.map((m) => m.username)).toEqual(['owner_user', 'amal', 'zed'])
      expect(res.body.members[1]).toMatchObject({ role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED', userId: amal.id })
      expect(res.body.invitations).toEqual([expect.objectContaining({ username: 'waiting' })])
    })

    it('does not show pending invitations to a team member', async () => {
      const member = await createUser('member')
      await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
      await createUser('waiting')
      await invite(owner, 'waiting')

      const res = await request(app).get(`/api/projects/${project.id}/members`).set(authHeader(member))
      expect(res.status).toBe(200)
      expect(res.body.invitations).toEqual([])
    })

    it('answers not found to a non-member, and to an ID that is not a UUID', async () => {
      const outsider = await createUser('outsider')
      const res = await request(app).get(`/api/projects/${project.id}/members`).set(authHeader(outsider))
      expect(res.status).toBe(404)
      const bad = await request(app).get('/api/projects/abc/members').set(authHeader(owner))
      expect(bad.status).toBe(404)
    })

    it('refuses a request without sign-in', async () => {
      const res = await request(app).get(`/api/projects/${project.id}/members`)
      expect(res.status).toBe(401)
    })
  })

  describe('US-10: PATCH /api/projects/:projectId/members/:userId', () => {
    let member
    const setAccess = (as, userId, taskAccess, projectId = project.id) =>
      request(app).patch(`/api/projects/${projectId}/members/${userId}`).set(authHeader(as)).send({ taskAccess })

    beforeEach(async () => {
      member = await createUser('member')
      await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
    })

    it('lets the owner change a member to each access level, and it applies at once', async () => {
      for (const level of ['VIEW_ONLY', 'EDIT_ALL', 'EDIT_ASSIGNED']) {
        const res = await setAccess(owner, member.id, level)
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ userId: member.id, username: 'member', role: 'MEMBER', taskAccess: level })
      }
      const opened = await request(app).get(`/api/projects/${project.id}`).set(authHeader(member))
      expect(opened.body.taskAccess).toBe('EDIT_ASSIGNED')
    })

    it('refuses an unknown access level', async () => {
      const res = await setAccess(owner, member.id, 'ADMIN')
      expect(res.status).toBe(422)
      expect(res.body.error.fieldErrors[0].field).toBe('taskAccess')
    })

    it('lets only the owner change access, even for a member with Edit all tasks', async () => {
      await prisma.projectMember.update({
        where: { projectId_userId: { projectId: project.id, userId: member.id } },
        data: { taskAccess: 'EDIT_ALL' },
      })
      const other = await createUser('other')
      await prisma.projectMember.create({ data: { projectId: project.id, userId: other.id } })

      const res = await setAccess(member, other.id, 'EDIT_ALL')
      expect(res.status).toBe(403)
      expect(res.body.error.message).toBe('Only the project owner can change task access.')
    })

    it("does not change the owner's own access", async () => {
      const res = await setAccess(owner, owner.id, 'VIEW_ONLY')
      expect(res.status).toBe(404)
      const row = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: owner.id } },
      })
      expect(row).toMatchObject({ role: 'OWNER', taskAccess: 'EDIT_ALL' })
    })

    it('answers not found for someone who is not in the project, or a malformed ID', async () => {
      const outsider = await createUser('outsider')
      expect((await setAccess(owner, outsider.id, 'EDIT_ALL')).status).toBe(404)
      expect((await setAccess(owner, 'abc', 'EDIT_ALL')).status).toBe(404)
      expect(await prisma.projectMember.count({ where: { userId: outsider.id } })).toBe(0)
    })

    it('answers not found when the caller is not in the project', async () => {
      const outsider = await createUser('outsider')
      expect((await setAccess(outsider, member.id, 'EDIT_ALL')).status).toBe(404)
    })
  })

  describe('US-07: POST /api/projects/:projectId/invitations', () => {
    it('invites a registered user, and the invitation appears in their notifications', async () => {
      const sara = await createUser('sara')
      const res = await invite(owner, ' @Sara ')
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ username: 'sara' })

      const invitation = await prisma.invitation.findUnique({ where: { id: res.body.id } })
      expect(invitation).toMatchObject({ status: 'PENDING', invitedUserId: sara.id, invitedById: owner.id })

      const notifications = await request(app).get('/api/notifications').set(authHeader(sara))
      expect(notifications.body.unreadCount).toBe(1)
      expect(notifications.body.items[0]).toMatchObject({
        type: 'INVITATION',
        invitationId: res.body.id,
        actorUsername: 'owner_user',
        projectName: 'Graduation project',
        invitationStatus: 'PENDING',
        read: false,
      })
    })

    it('explains an empty or unknown username', async () => {
      expect((await invite(owner, '  ')).body.error.fieldErrors[0].message).toBe('Enter a username.')
      const res = await invite(owner, 'nobody_here')
      expect(res.status).toBe(422)
      expect(res.body.error.fieldErrors[0]).toEqual({
        field: 'username',
        message: 'No user has the username nobody_here.',
      })
    })

    it('refuses to invite a current member or the owner', async () => {
      const member = await createUser('member')
      await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })
      expect((await invite(owner, 'member')).body.error.fieldErrors[0].message).toMatch(/already a member/)
      expect((await invite(owner, 'owner_user')).body.error.fieldErrors[0].message).toMatch(/already a member/)
    })

    it('refuses a second invitation while one is pending, but allows one after a decline', async () => {
      const sara = await createUser('sara')
      const first = await invite(owner, 'sara')
      const again = await invite(owner, 'sara')
      expect(again.status).toBe(422)
      expect(again.body.error.fieldErrors[0].message).toMatch(/pending invitation/)

      await answer(sara, first.body.id, 'decline')
      expect((await invite(owner, 'sara')).status).toBe(201)
    })

    it('lets only the owner invite', async () => {
      const member = await createUser('member')
      await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id, taskAccess: 'EDIT_ALL' } })
      await createUser('sara')
      const res = await invite(member, 'sara')
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
      expect(await prisma.invitation.count()).toBe(0)
    })

    it('answers not found to a non-member', async () => {
      const outsider = await createUser('outsider')
      await createUser('sara')
      expect((await invite(outsider, 'sara')).status).toBe(404)
    })
  })

  describe('US-08: accept or decline an invitation', () => {
    let sara, invitationId

    beforeEach(async () => {
      sara = await createUser('sara')
      invitationId = (await invite(owner, 'sara')).body.id
    })

    it('accepting adds the user as a Team Member with Edit assigned tasks access', async () => {
      const res = await answer(sara, invitationId, 'accept')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ id: invitationId, status: 'ACCEPTED', projectId: project.id })

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: sara.id } },
      })
      expect(member).toMatchObject({ role: 'MEMBER', taskAccess: 'EDIT_ASSIGNED' })

      // The project now opens for her, and her invitation notification is answered and read.
      expect((await request(app).get(`/api/projects/${project.id}`).set(authHeader(sara))).status).toBe(200)
      const notifications = await request(app).get('/api/notifications').set(authHeader(sara))
      expect(notifications.body.unreadCount).toBe(0)
      expect(notifications.body.items[0]).toMatchObject({ invitationStatus: 'ACCEPTED', read: true })
    })

    it('declining removes the invitation and the user does not join', async () => {
      const res = await answer(sara, invitationId, 'decline')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('DECLINED')
      expect(await prisma.projectMember.count({ where: { userId: sara.id } })).toBe(0)

      const members = await request(app).get(`/api/projects/${project.id}/members`).set(authHeader(owner))
      expect(members.body.invitations).toEqual([])
      expect((await request(app).get(`/api/projects/${project.id}`).set(authHeader(sara))).status).toBe(404)
    })

    it('answers an invitation only once', async () => {
      expect((await answer(sara, invitationId, 'accept')).status).toBe(200)
      const again = await answer(sara, invitationId, 'decline')
      expect(again.status).toBe(404)
      expect(again.body.error.message).toBe('This invitation is no longer available.')
      expect(await prisma.projectMember.count({ where: { userId: sara.id } })).toBe(1)
    })

    it('lets only the invited user answer', async () => {
      const other = await createUser('other')
      expect((await answer(other, invitationId, 'accept')).status).toBe(404)
      expect((await answer(owner, invitationId, 'accept')).status).toBe(404)
      expect(await prisma.projectMember.count({ where: { userId: other.id } })).toBe(0)
    })

    it('answers not found to an unknown or malformed invitation ID', async () => {
      expect((await answer(sara, randomUUID(), 'accept')).status).toBe(404)
      expect((await answer(sara, 'abc', 'decline')).status).toBe(404)
    })
  })
})
