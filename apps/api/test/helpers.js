import { randomUUID } from 'node:crypto'
import { prisma } from '../src/db.js'

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL)

export async function resetDatabase() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.taskAssignee.deleteMany(),
    prisma.task.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

// Creates a user. Pass null as the username for a user who has not chosen one yet.
export function createUser(username = `user_${randomUUID().slice(0, 8)}`) {
  const authId = randomUUID()
  return prisma.user.create({ data: { authId, email: `${username ?? authId}@test.dev`, username } })
}

// The Authorization header the fake Supabase accepts for this user.
export function authHeader(user) {
  return { Authorization: `Bearer test:${user.authId}:${user.email}` }
}

export function tokenFor(authId, email) {
  return { Authorization: `Bearer test:${authId}:${email}` }
}
