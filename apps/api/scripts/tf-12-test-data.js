
import '../src/config.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BOARD_SIZES = [30, 100, 300]
const STATUSES = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'DONE',
]
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']

const OWNER_EMAIL = process.env.TF12_OWNER_EMAIL
const DATABASE_URL = process.env.DATABASE_URL

function checkEnvironment() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('TF-12 requires NODE_ENV=development.')
  }

  if (process.env.TF12_ALLOW_SEED !== 'true') {
    throw new Error('Set TF12_ALLOW_SEED=true to enable test data creation.')
  }

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.')
  }

  const url = new URL(DATABASE_URL)

  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('Only PostgreSQL databases are supported.')
  }

  // Require a dedicated development database or schema.
  const database = decodeURIComponent(url.pathname.slice(1)).toLowerCase()
  const schema = (url.searchParams.get('schema') || 'public').toLowerCase()

  if (!database.includes('dev') && !schema.includes('dev')) {
    throw new Error(
      'Use a dedicated development database or schema containing "dev".'
    )
  }

  if (!OWNER_EMAIL) {
    throw new Error('TF12_OWNER_EMAIL is required.')
  }
}

async function createBoard(owner, size) {
  const name = `TF-12 Load Test - ${size} Tasks`

  const existing = await prisma.project.findFirst({
    where: {
      name,
      createdById: owner.id,
    },
    select: { id: true },
  })

  if (existing) {
    console.log(`Skipped existing board: ${name}`)
    return existing.id
  }

  const projectId = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name,
        description: `Development test board containing ${size} tasks.`,
        createdById: owner.id,
        members: {
          create: {
            userId: owner.id,
            role: 'OWNER',
            taskAccess: 'EDIT_ALL',
          },
        },
      },
    })

    const positions = Object.fromEntries(
      STATUSES.map((status) => [status, 0])
    )

    const tasks = Array.from({ length: size }, (_, index) => {
      const status = STATUSES[index % STATUSES.length]
      positions[status] += 1

      return {
        projectId: project.id,
        title: `Test Task ${String(index + 1).padStart(3, '0')}`,
        description: `Generated for TF-12 load testing (${size}-task board).`,
        status,
        priority: PRIORITIES[index % PRIORITIES.length],
        position: positions[status],
        createdById: owner.id,
      }
    })

    // createManyAndReturn provides IDs for task assignments.
    const createdTasks = await tx.task.createManyAndReturn({
      data: tasks,
      select: { id: true },
    })

    await tx.taskAssignee.createMany({
      data: createdTasks.map((task) => ({
        taskId: task.id,
        userId: owner.id,
      })),
    })

    return project.id
  }, { timeout: 30000 })

  console.log(`Created ${name} (${projectId})`)
  return projectId
}

async function main() {
  checkEnvironment()

  const owner = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
  })

  if (!owner) {
    throw new Error(
      `Owner not found: ${OWNER_EMAIL}. Create the account in the development database first.`
    )
  }

  for (const size of BOARD_SIZES) {
    await createBoard(owner, size)
  }

  console.log('TF-12 test boards are ready.')
}

main()
  .catch((error) => {
    console.error('TF-12 failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
