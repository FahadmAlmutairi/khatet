// Shared project access checks (docs/data-model.md, Invariants).
// Every project route loads the signed-in user's membership here first.
import { prisma } from '../db.js'
import { ApiError, forbidden } from '../lib/errors.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// IDs are UUIDs. Anything else cannot exist, so it gets the normal not-found answer
// instead of reaching the database (where Prisma would fail with a 500).
export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

// A user can open only the projects they belong to (NFR-11). A project that does not
// exist and one the user is not in get the same answer, so IDs cannot be probed.
// An archived project answers 410 PROJECT_ARCHIVED everywhere except the project log, which
// passes { allowArchived: true }. A member who deleted the archived log is no longer a member.
export async function findMembership(projectId, userId, { allowArchived = false } = {}) {
  const membership = isUuid(projectId)
    ? await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        include: { project: true },
      })
    : null

  if (!membership || membership.archiveRemovedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'This project does not exist or you are not a member of it.')
  }
  if (membership.project.archivedAt && !allowArchived) throw archived()
  return membership
}

export function archived() {
  return new ApiError(
    410,
    'PROJECT_ARCHIVED',
    'This project is archived. Its project log is in Settings, under Archived projects.',
  )
}

// Only the owner manages membership, invitations, task access, phases and settings.
export async function findOwnerMembership(projectId, userId, message) {
  const membership = await findMembership(projectId, userId)
  if (membership.role !== 'OWNER') throw forbidden(message)
  return membership
}
