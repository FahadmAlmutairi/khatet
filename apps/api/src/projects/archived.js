// Archived projects (docs/api-contract.md, Archived projects). Each member keeps the project
// log under Settings > Archived projects until they delete it for themselves. When the last
// member deletes it, the project and everything in it are removed for good.
// GET    /api/archived-projects              the signed-in user's archived projects, newest first
// GET    /api/archived-projects/:projectId   one of them (the log itself is GET /api/projects/:projectId/activity)
// DELETE /api/archived-projects/:projectId   delete it for the signed-in user only (204)
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { notFound } from '../lib/errors.js'
import { TRANSACTION_OPTIONS } from '../lib/transactions.js'
import { isUuid } from './access.js'

export const archivedRouter = Router()

const signedIn = [requireAuth, requireUsername]

export function serializeArchivedProject(project, archivedByUsername, role = 'OWNER') {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    archivedAt: project.archivedAt,
    archivedByUsername: archivedByUsername ?? 'unknown',
    role,
    summary: project.archiveSummary,
  }
}

const withProject = { project: { include: { archivedBy: { select: { username: true } } } } }

function fromMembership(membership) {
  const { project } = membership
  return serializeArchivedProject(project, project.archivedBy?.username, membership.role)
}

const gone = () => notFound('This archived project does not exist or you deleted it.')

async function findArchivedMembership(projectId, userId, client = prisma) {
  const membership = isUuid(projectId)
    ? await client.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        include: withProject,
      })
    : null
  if (!membership || membership.archiveRemovedAt || !membership.project.archivedAt) throw gone()
  return membership
}

archivedRouter.get('/archived-projects', signedIn, async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id, archiveRemovedAt: null, project: { archivedAt: { not: null } } },
    include: withProject,
    orderBy: { project: { archivedAt: 'desc' } },
  })
  res.json(memberships.map(fromMembership))
})

archivedRouter.get('/archived-projects/:projectId', signedIn, async (req, res) => {
  res.json(fromMembership(await findArchivedMembership(req.params.projectId, req.user.id)))
})

archivedRouter.delete('/archived-projects/:projectId', signedIn, async (req, res) => {
  const { projectId } = req.params
  if (!isUuid(projectId)) throw gone()

  await prisma.$transaction(async (tx) => {
    // Two members deleting at once must not both leave the project behind.
    await tx.$queryRaw`SELECT 1 FROM "projects" WHERE "id" = ${projectId}::uuid FOR UPDATE`
    await findArchivedMembership(projectId, req.user.id, tx)
    await tx.projectMember.update({
      where: { projectId_userId: { projectId, userId: req.user.id } },
      data: { archiveRemovedAt: new Date() },
    })
    const keeping = await tx.projectMember.count({ where: { projectId, archiveRemovedAt: null } })
    // Nobody keeps it any more: remove the project with its log, tasks, chat and reports.
    if (keeping === 0) await tx.project.delete({ where: { id: projectId } })
  }, TRANSACTION_OPTIONS)

  res.status(204).end()
})
