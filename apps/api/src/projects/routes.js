
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { invalid, MAX_TEXT_LENGTH } from '../lib/errors.js'
import { TRANSACTION_OPTIONS } from '../lib/transactions.js'
import { recordActivity } from '../activity/record.js'
import { archived, findMembership, findOwnerMembership } from './access.js'
import { serializeArchivedProject } from './archived.js'

const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE']

export const projectsRouter = Router()

projectsRouter.use(requireAuth, requireUsername)

function serializeProject(project, membership) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    role: membership.role,
    taskAccess: membership.taskAccess,
    permissions: {
      canCreateTask:
        membership.role === 'OWNER' ||
        membership.taskAccess === 'EDIT_ALL',
      canManageMembers: membership.role === 'OWNER',
    },
  }
}

// US-04: List projects belonging to the signed-in user.
projectsRouter.get('/', async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id, project: { archivedAt: null } },
    include: { project: true },
    orderBy: { project: { createdAt: 'asc' } },
  })

  res.json(
    memberships.map(({ project, ...membership }) =>
      serializeProject(project, membership),
    ),
  )
})

// US-05: Create a project and make its creator the owner.
projectsRouter.post('/', async (req, res) => {
  const name =
    typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const description =
    typeof req.body?.description === 'string'
      ? req.body.description.trim()
      : ''

  if (!name) {
    throw invalid([{ field: 'name', message: 'Enter a project name.' }])
  }

  if (name.length > 200) {
    throw invalid([
      { field: 'name', message: 'Keep the project name under 200 characters.' },
    ])
  }

  if (description.length > MAX_TEXT_LENGTH) {
    throw invalid([
      { field: 'description', message: `Keep the description under ${MAX_TEXT_LENGTH} characters.` },
    ])
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      createdById: req.user.id,
      members: {
        create: {
          userId: req.user.id,
          role: 'OWNER',
          taskAccess: 'EDIT_ALL',
        },
      },
      activityEvents: {
        create: {
          actorId: req.user.id,
          actorUsername: req.user.username,
          type: 'PROJECT_CREATED',
          details: { name },
        },
      },
    },
    include: {
      members: { where: { userId: req.user.id } },
    },
  })

  res.status(201).json(
    serializeProject(project, project.members[0]),
  )
})

// US-06: Open a project only if the user is a member.
projectsRouter.get('/:projectId', async (req, res) => {
  const membership = await findMembership(
    req.params.projectId,
    req.user.id,
  )

  res.json(serializeProject(membership.project, membership))
})
// US-26: Only the project owner can update project settings.
projectsRouter.patch('/:projectId', async (req, res) => {
  const membership = await findOwnerMembership(
    req.params.projectId,
    req.user.id,
    'Only the project owner can change project settings.',
  )

  const data = {}
  const fieldErrors = []

  if (Object.hasOwn(req.body ?? {}, 'name')) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
      fieldErrors.push({
        field: 'name',
        message: 'Enter a project name.',
      })
    } else if (req.body.name.trim().length > 200) {
      fieldErrors.push({
        field: 'name',
        message: 'Keep the project name under 200 characters.',
      })
    } else {
      data.name = req.body.name.trim()
    }
  }

  if (Object.hasOwn(req.body ?? {}, 'description')) {
    if (typeof req.body.description !== 'string') {
      fieldErrors.push({
        field: 'description',
        message: 'Enter a valid description.',
      })
    } else if (req.body.description.trim().length > MAX_TEXT_LENGTH) {
      fieldErrors.push({
        field: 'description',
        message: `Keep the description under ${MAX_TEXT_LENGTH} characters.`,
      })
    } else {
      data.description = req.body.description.trim()
    }
  }

  if (fieldErrors.length) {
    throw invalid(fieldErrors)
  }

  if (!Object.keys(data).length) {
    throw invalid([
      {
        field: 'name',
        message: 'Provide a name or description to update.',
      },
    ])
  }

  const before = membership.project
  const project = await prisma.$transaction(async (tx) => {
    const saved = await tx.project.update({ where: { id: before.id }, data })
    const changes = []
    if (saved.name !== before.name) changes.push({ field: 'name', from: before.name, to: saved.name })
    if (saved.description !== before.description) changes.push({ field: 'description' })
    if (changes.length) {
      await recordActivity(tx, { projectId: saved.id, actor: req.user, type: 'PROJECT_UPDATED', details: { changes } })
    }
    return saved
  }, TRANSACTION_OPTIONS)

  res.json(serializeProject(project, membership))
})
// Owner only: archive the project. The board, chat, members and reports close for good, and
// pending invitations and the project's notifications are removed. The project log stays
// readable for every member under Settings > Archived projects, with a summary copied now.
projectsRouter.post('/:projectId/archive', async (req, res) => {
  const { projectId } = await findOwnerMembership(
    req.params.projectId,
    req.user.id,
    'Only the project owner can archive the project.',
  )

  const project = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "projects" WHERE "id" = ${projectId}::uuid FOR UPDATE`
    const current = await tx.project.findUnique({ where: { id: projectId } })
    if (current.archivedAt) throw archived()

    const [members, counts] = await Promise.all([
      tx.projectMember.findMany({
        where: { projectId },
        include: { user: { select: { username: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
      tx.task.groupBy({ by: ['status'], where: { projectId }, _count: { _all: true } }),
    ])
    const tasksByStatus = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0]))
    for (const row of counts) tasksByStatus[row.status] = row._count._all
    const summary = {
      name: current.name,
      description: current.description,
      createdAt: current.createdAt,
      members: members.map((member) => ({ userId: member.userId, username: member.user.username, role: member.role })),
      tasks: { total: Object.values(tasksByStatus).reduce((sum, count) => sum + count, 0), byStatus: tasksByStatus },
    }

    await tx.invitation.deleteMany({ where: { projectId, status: 'PENDING' } })
    await tx.notification.deleteMany({ where: { projectId } })
    await recordActivity(tx, { projectId, actor: req.user, type: 'PROJECT_ARCHIVED', details: { name: current.name } })
    return tx.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date(), archivedById: req.user.id, archiveSummary: summary },
    })
  }, TRANSACTION_OPTIONS)

  res.json(serializeArchivedProject(project, req.user.username))
})
