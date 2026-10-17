
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { invalid } from '../lib/errors.js'
import { findMembership } from './access.js'

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
    where: { userId: req.user.id },
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
