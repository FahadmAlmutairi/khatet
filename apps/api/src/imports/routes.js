// US-33: import tasks from a CSV file (docs/api-contract.md, Import contract).
// POST /api/projects/:projectId/imports/preview  body { csv, mapping? }: reads the file, saves nothing
// POST /api/projects/:projectId/imports/confirm  body { csv, mapping }: creates the valid rows
// The browser reads the file and sends its text, so there is no upload storage and no import
// state between the steps: confirm reads the file and checks every row again.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { invalid } from '../lib/errors.js'
import { findOwnerMembership } from '../projects/access.js'
import { notifyAssigned } from '../notifications/routes.js'
import { parseCsv } from './csv.js'
import { checkMapping, readRow, readTable, suggestMapping } from './importRows.js'

export const importsRouter = Router()

const signedIn = [requireAuth, requireUsername]
const SAMPLE_ROWS = 3
// Up to 500 tasks are created in one go, so this transaction may take longer than others.
const IMPORT_TRANSACTION = { maxWait: 10_000, timeout: 60_000 }

// The steps every request shares: owner only, a readable file, and the members by username.
async function load(req) {
  const membership = await findOwnerMembership(req.params.projectId, req.user.id, 'Only the project owner can import tasks.')
  const text = req.body?.csv
  const parsed = parseCsv(typeof text === 'string' ? text : '')
  const table = readTable(parsed, text)
  if (table.errors.length) throw invalid(table.errors.map((message) => ({ field: 'csv', message })))

  const members = await prisma.projectMember.findMany({
    where: { projectId: membership.projectId },
    select: { user: { select: { id: true, username: true } } },
  })
  const byUsername = new Map(
    members.filter(({ user }) => user.username).map(({ user }) => [user.username.toLowerCase(), user]),
  )
  return { membership, table, members: byUsername }
}

function checkedRows(req, table, members, mapping) {
  const problem = checkMapping(mapping, table.columns)
  if (problem) throw invalid([{ field: 'mapping', message: problem }])
  return table.rows.map((row) => readRow(row, mapping, { members, importer: req.user }))
}

function publicRow({ line, values, errors }) {
  const { assigneeIds: _ids, ...shown } = values
  return { line, values: shown, errors }
}

// Without `mapping`: the columns, a suggested field for each and a few sample rows, for the
// matching step. With `mapping`: every row with its values and problems, for the preview.
importsRouter.post('/projects/:projectId/imports/preview', signedIn, async (req, res) => {
  const { table, members } = await load(req)
  const answer = {
    columns: table.columns,
    suggestedMapping: suggestMapping(table.columns),
    rowCount: table.rows.length,
    sample: table.rows.slice(0, SAMPLE_ROWS).map((row) => table.columns.map((_, index) => (row.cells[index] ?? '').trim())),
  }
  if (req.body?.mapping === undefined) return res.json(answer)

  const rows = checkedRows(req, table, members, req.body.mapping)
  const validCount = rows.filter((row) => row.errors.length === 0).length
  res.json({
    ...answer,
    mapping: req.body.mapping,
    rows: rows.map(publicRow),
    validCount,
    skippedCount: rows.length - validCount,
  })
})

// Creates only the rows without problems, in file order at the end of their columns, in one
// transaction. Each new task is logged and its assignees (except the owner) are notified.
importsRouter.post('/projects/:projectId/imports/confirm', signedIn, async (req, res) => {
  const { membership, table, members } = await load(req)
  const rows = checkedRows(req, table, members, req.body?.mapping)
  const valid = rows.filter((row) => row.errors.length === 0)
  if (valid.length === 0) {
    throw invalid([{ field: 'csv', message: 'No row is ready to import. Fix the problems in the file and upload it again.' }])
  }
  const { projectId } = membership

  const created = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "projects" WHERE "id" = ${projectId}::uuid FOR UPDATE`
    const last = await tx.task.groupBy({ by: ['status'], where: { projectId }, _max: { position: true } })
    const next = Object.fromEntries(last.map((group) => [group.status, group._max.position ?? 0]))

    const tasks = []
    for (const { values } of valid) {
      next[values.status] = (next[values.status] ?? 0) + 1
      tasks.push(
        await tx.task.create({
          data: {
            projectId,
            title: values.title,
            description: values.description,
            status: values.status,
            priority: values.priority,
            dueDate: values.dueDate ? new Date(`${values.dueDate}T00:00:00Z`) : null,
            position: next[values.status],
            createdById: req.user.id,
            assignees: { create: values.assigneeIds.map((userId) => ({ userId })) },
          },
          select: { id: true, title: true, projectId: true },
        }),
      )
    }

    await tx.activityEvent.createMany({
      data: tasks.map((task, index) => ({
        projectId,
        actorId: req.user.id,
        actorUsername: req.user.username,
        type: 'TASK_CREATED',
        taskId: task.id,
        taskTitle: task.title,
        details: { status: valid[index].values.status, assignees: valid[index].values.assignees, imported: true },
      })),
    })
    for (const [index, task] of tasks.entries()) {
      await notifyAssigned(tx, { task, userIds: valid[index].values.assigneeIds, actorId: req.user.id })
    }
    return tasks
  }, IMPORT_TRANSACTION)

  res.status(201).json({
    createdCount: created.length,
    skippedCount: rows.length - created.length,
    taskIds: created.map((task) => task.id),
  })
})
