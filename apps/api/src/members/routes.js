// Project members and invitations.
// GET   /api/projects/:projectId/members          US-09: owner and members; the owner also sees pending invitations
// PATCH /api/projects/:projectId/members/:userId  US-10: owner sets task access, body: { "taskAccess": "EDIT_ALL" }
// POST  /api/projects/:projectId/invitations      US-07: owner invites a registered user, body: { "username": "sara" }
// POST  /api/invitations/:invitationId/accept     US-08: the invitee joins with Edit assigned tasks access
// POST  /api/invitations/:invitationId/decline    US-08: the invitee does not join
// Response shapes match the sample versions in apps/web/src/api/mockServer.js.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { invalid, notFound } from '../lib/errors.js'
import { TRANSACTION_OPTIONS } from '../lib/transactions.js'
import { findMembership, findOwnerMembership, isUuid } from '../projects/access.js'

export const membersRouter = Router()

const signedIn = [requireAuth, requireUsername]

function serializeMember(member) {
  return {
    projectId: member.projectId,
    userId: member.userId,
    role: member.role,
    taskAccess: member.taskAccess,
    joinedAt: member.joinedAt,
    username: member.user.username,
  }
}

function serializeInvitation(invitation) {
  return { id: invitation.id, username: invitation.invitedUser.username, createdAt: invitation.createdAt }
}

// Same clean-up as choosing a username (auth/routes.js): "@Sara " finds "sara".
function cleanUsername(value) {
  return String(value ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
}

membersRouter.get('/projects/:projectId/members', signedIn, async (req, res) => {
  const membership = await findMembership(req.params.projectId, req.user.id)
  const projectId = membership.projectId

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { username: true } } },
  })
  // The owner first, then members by username.
  members.sort((a, b) =>
    a.role === b.role ? a.user.username.localeCompare(b.user.username) : a.role === 'OWNER' ? -1 : 1,
  )

  // Only the owner manages invitations, so only the owner sees the pending ones.
  const invitations =
    membership.role === 'OWNER'
      ? await prisma.invitation.findMany({
          where: { projectId, status: 'PENDING' },
          include: { invitedUser: { select: { username: true } } },
          orderBy: { createdAt: 'asc' },
        })
      : []

  res.json({ members: members.map(serializeMember), invitations: invitations.map(serializeInvitation) })
})

const TASK_ACCESS_LEVELS = ['VIEW_ONLY', 'EDIT_ASSIGNED', 'EDIT_ALL']

// US-10: the owner sets a Team Member's task access; it applies to their next request.
membersRouter.patch('/projects/:projectId/members/:userId', signedIn, async (req, res) => {
  const { projectId } = await findOwnerMembership(
    req.params.projectId,
    req.user.id,
    'Only the project owner can change task access.',
  )

  const { taskAccess } = req.body ?? {}
  if (!TASK_ACCESS_LEVELS.includes(taskAccess)) {
    throw invalid([{ field: 'taskAccess', message: 'Choose an access level.' }])
  }

  // The owner always has full access, so the owner's own row cannot be changed.
  const { userId } = req.params
  const gone = () => notFound('This member is no longer in the project.')
  if (!isUuid(userId)) throw gone()
  const { count } = await prisma.projectMember.updateMany({
    where: { projectId, userId, role: 'MEMBER' },
    data: { taskAccess },
  })
  if (count === 0) throw gone()

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { user: { select: { username: true } } },
  })
  res.json(serializeMember(member))
})

// US-07: a sent invitation appears in the invitee's notifications.
membersRouter.post('/projects/:projectId/invitations', signedIn, async (req, res) => {
  const { projectId } = await findOwnerMembership(
    req.params.projectId,
    req.user.id,
    'Only the project owner can invite members.',
  )

  const username = cleanUsername(req.body?.username)
  if (!username) throw invalid([{ field: 'username', message: 'Enter a username.' }])

  const invitedUser = await prisma.user.findUnique({ where: { username } })
  if (!invitedUser) throw invalid([{ field: 'username', message: `No user has the username ${username}.` }])

  const invitation = await prisma.$transaction(async (tx) => {
    const isMember = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: invitedUser.id } },
    })
    if (isMember) throw invalid([{ field: 'username', message: `${username} is already a member of this project.` }])

    const pending = await tx.invitation.findFirst({
      where: { projectId, invitedUserId: invitedUser.id, status: 'PENDING' },
    })
    if (pending) throw invalid([{ field: 'username', message: `${username} already has a pending invitation.` }])

    const created = await tx.invitation.create({
      data: { projectId, invitedUserId: invitedUser.id, invitedById: req.user.id },
    })
    await tx.notification.create({
      data: {
        userId: invitedUser.id,
        type: 'INVITATION',
        projectId,
        actorId: req.user.id,
        invitationId: created.id,
        createdAt: created.createdAt,
      },
    })
    return created
  }, TRANSACTION_OPTIONS)

  res.status(201).json({ id: invitation.id, username, createdAt: invitation.createdAt })
})

// US-08: only the invited user can answer, and only while the invitation is pending.
// The answer and its effects are saved in one transaction (docs/data-model.md, Database rules).
async function answerInvitation(req, res, accept) {
  const { invitationId } = req.params
  const gone = () => notFound('This invitation is no longer available.')
  if (!isUuid(invitationId)) throw gone()

  const result = await prisma.$transaction(async (tx) => {
    // Changing only a PENDING row makes a double click or two tabs answer once.
    const { count } = await tx.invitation.updateMany({
      where: { id: invitationId, invitedUserId: req.user.id, status: 'PENDING' },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
    })
    if (count === 0) throw gone()

    const invitation = await tx.invitation.findUnique({ where: { id: invitationId } })
    if (accept) {
      // A new member gets Edit assigned tasks access (EDIT_ASSIGNED is the column default).
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: invitation.projectId, userId: req.user.id } },
        create: { projectId: invitation.projectId, userId: req.user.id, role: 'MEMBER' },
        update: {},
      })
    }
    // The invitation is answered, so its notification no longer needs attention.
    await tx.notification.updateMany({ where: { invitationId, userId: req.user.id }, data: { read: true } })
    return invitation
  }, TRANSACTION_OPTIONS)

  res.json({ id: result.id, status: result.status, projectId: result.projectId })
}

membersRouter.post('/invitations/:invitationId/accept', signedIn, (req, res) => answerInvitation(req, res, true))
membersRouter.post('/invitations/:invitationId/decline', signedIn, (req, res) => answerInvitation(req, res, false))
