// Fills a development database with sample data: one owner, one member per task
// access level, and a project. Run with: npm run db:seed (safe to run again).
// The auth IDs are made up, so these users cannot sign in; they exist for testing.
import '../src/config.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const users = [
  { authId: '00000000-0000-4000-8000-000000000001', email: 'owner@example.com', username: 'owner' },
  { authId: '00000000-0000-4000-8000-000000000002', email: 'viewer@example.com', username: 'viewer' },
  { authId: '00000000-0000-4000-8000-000000000003', email: 'assigned@example.com', username: 'assigned' },
  { authId: '00000000-0000-4000-8000-000000000004', email: 'editor@example.com', username: 'editor' },
  { authId: '00000000-0000-4000-8000-000000000005', email: 'newcomer@example.com', username: 'newcomer' },
]

async function main() {
  const saved = {}
  for (const user of users) {
    saved[user.username] = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
  }

  const projectId = '10000000-0000-4000-8000-000000000001'
  await prisma.project.upsert({
    where: { id: projectId },
    update: {},
    create: {
      id: projectId,
      name: 'Sample project',
      description: 'Created by the seed script.',
      createdById: saved.owner.id,
      members: {
        create: [
          { userId: saved.owner.id, role: 'OWNER', taskAccess: 'EDIT_ALL' },
          { userId: saved.viewer.id, taskAccess: 'VIEW_ONLY' },
          { userId: saved.assigned.id, taskAccess: 'EDIT_ASSIGNED' },
          { userId: saved.editor.id, taskAccess: 'EDIT_ALL' },
        ],
      },
    },
  })
  // "newcomer" is not a member of the project.
  console.log('Seed data is ready: 5 users and "Sample project".')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
