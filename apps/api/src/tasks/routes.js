// Tasks (US-13 to US-18, US-21).
// GET  /api/projects/:projectId/tasks   US-21: every task in the project, for the board
// POST /api/projects/:projectId/tasks   US-13: body { title, assigneeIds, description?, priority?, dueDate? }
// GET    /api/tasks/:taskId              US-14: one task, for the task details page
// PATCH  /api/tasks/:taskId              US-15, US-17: body with any of the create fields, isBlocked?, blockedReason?
// POST   /api/tasks/:taskId/move         US-16: body { status, position }; answers every task in the project
// DELETE /api/tasks/:taskId              US-18: answers { id }
// Response shape matches the sample version in apps/web/src/api/mockServer.js.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { ApiError, forbidden, invalid } from '../lib/errors.js'
import { TRANSACTION_OPTIONS } from '../lib/transactions.js'
import { notifyAssigned } from '../notifications/routes.js'
import { findMembership, isUuid } from '../projects/access.js'

export const tasksRouter = Router()

const signedIn = [requireAuth, requireUsername]

// Board column order (docs/data-model.md, Enumerations).
const STATUS_ORDER = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const withAssignees = { assignees: { select: { userId: true }, orderBy: { assignedAt: 'asc' } } }

function canEditAll(membership) {
  return membership.role === 'OWNER' || membership.taskAccess === 'EDIT_ALL'
}

// "2026-10-19" -> a Date at midnight UTC, or null if it is not a real calendar day (2026-02-30).
function parseDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return date.toISOString().startsWith(value) ? date : null
}

// Checks the task fields in a request body and returns them ready to save.
// `partial` is for edits (US-15): only the fields that were sent are checked.
// Field names and messages match the sample version, so the form shows them next to each field.
export async function validateTaskFields(body, projectId, { partial }) {
  const input = body && typeof body === 'object' ? body : {}
  const errors = []
  const clean = {}

  if (!partial || 'title' in input) {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!title) errors.push({ field: 'title', message: 'Enter a task title.' })
    else if (title.length > 200) errors.push({ field: 'title', message: 'Keep the title under 200 characters.' })
    clean.title = title
  }

  if (!partial || 'assigneeIds' in input) {
    const ids = Array.isArray(input.assigneeIds) ? [...new Set(input.assigneeIds)] : []
    if (ids.length === 0) {
      errors.push({ field: 'assigneeIds', message: 'Choose at least one assignee.' })
    } else {
      // Every assignee must be a member of this project (docs/data-model.md, Invariants).
      const members = ids.every(isUuid)
        ? await prisma.projectMember.count({ where: { projectId, userId: { in: ids } } })
        : -1
      if (members !== ids.length) {
        errors.push({ field: 'assigneeIds', message: 'Assignees must be members of this project.' })
      }
    }
    clean.assigneeIds = ids
  }

  if ('description' in input) {
    clean.description = typeof input.description === 'string' ? input.description.trim() : ''
  }

  if ('priority' in input) {
    const priority = input.priority || null
    if (priority !== null && !PRIORITIES.includes(priority)) {
      errors.push({ field: 'priority', message: 'Choose a priority.' })
    }
    clean.priority = priority
  }

  if ('dueDate' in input) {
    const dueDate = input.dueDate ? parseDate(input.dueDate) : null
    if (input.dueDate && !dueDate) errors.push({ field: 'dueDate', message: 'Enter a valid date.' })
    clean.dueDate = dueDate
  }

  if (errors.length) throw invalid(errors)
  return clean
}

// What this member may do with this task (docs/api-contract.md, Authentication and permissions).
// The owner and EDIT_ALL members can do everything; EDIT_ASSIGNED members can edit and move
// only their own tasks; VIEW_ONLY members can only read.
export function taskPermissions(task, membership) {
  const editAll = membership.role === 'OWNER' || membership.taskAccess === 'EDIT_ALL'
  const assigned = task.assignees.some((assignee) => assignee.userId === membership.userId)
  const canEdit = editAll || (membership.taskAccess === 'EDIT_ASSIGNED' && assigned)
  return { canEdit, canMove: canEdit, canDelete: editAll }
}

export function serializeTask(task, membership) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    position: task.position,
    isBlocked: task.isBlocked,
    blockedReason: task.blockedReason,
    priority: task.priority,
    // A calendar date with no time or timezone, for example "2026-10-19".
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    assigneeIds: task.assignees.map((assignee) => assignee.userId),
    createdById: task.createdById,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    permissions: taskPermissions(task, membership),
  }
}

// US-21: only members can see a project's tasks (NFR-11). An empty project answers [].
tasksRouter.get('/projects/:projectId/tasks', signedIn, async (req, res) => {
  const membership = await findMembership(req.params.projectId, req.user.id)

  const tasks = await prisma.task.findMany({
    where: { projectId: membership.projectId },
    include: withAssignees,
  })
  tasks.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.position - b.position)

  res.json(tasks.map((task) => serializeTask(task, membership)))
})

// US-13: the owner and members with Edit all tasks access create tasks. A new task starts in
// To Do at the end of the column, and each assignee (except the creator) is notified.
tasksRouter.post('/projects/:projectId/tasks', signedIn, async (req, res) => {
  const membership = await findMembership(req.params.projectId, req.user.id)
  if (!canEditAll(membership)) throw forbidden('You need Edit all tasks access to create tasks.')
  const { projectId } = membership

  const { assigneeIds, ...fields } = await validateTaskFields(req.body, projectId, { partial: false })

  const task = await prisma.$transaction(async (tx) => {
    // Locking the project row makes task writes in one project wait for each other,
    // so two tasks created at the same moment cannot get the same position.
    await tx.$queryRaw`SELECT 1 FROM "projects" WHERE "id" = ${projectId}::uuid FOR UPDATE`
    const last = await tx.task.aggregate({ where: { projectId, status: 'TODO' }, _max: { position: true } })

    const created = await tx.task.create({
      data: {
        ...fields,
        projectId,
        status: 'TODO',
        position: (last._max.position ?? 0) + 1,
        createdById: req.user.id,
        assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      },
      include: withAssignees,
    })
    await notifyAssigned(tx, { task: created, userIds: assigneeIds, actorId: req.user.id })
    return created
  }, TRANSACTION_OPTIONS)

  res.status(201).json(serializeTask(task, membership))
})

// A task can be reached only by members of its project. A task that does not exist and one
// in another project get the same answer, so IDs cannot be probed (NFR-11).
async function findTask(taskId, userId, client = prisma) {
  const task = isUuid(taskId) ? await client.task.findUnique({ where: { id: taskId }, include: withAssignees }) : null
  const membership = task
    ? await client.projectMember.findUnique({ where: { projectId_userId: { projectId: task.projectId, userId } } })
    : null
  if (!membership) throw new ApiError(404, 'NOT_FOUND', 'This task no longer exists. It may have been deleted.')
  return { task, membership }
}

// Locks the project row, so moves, deletes and creates in one project wait for each other
// and positions stay 1, 2, 3, ... in every column.
function lockProject(tx, projectId) {
  return tx.$queryRaw`SELECT 1 FROM "projects" WHERE "id" = ${projectId}::uuid FOR UPDATE`
}

// Gives the tasks in one column the positions 1, 2, 3, ... in the order given.
async function renumber(tx, tasks) {
  for (const [index, task] of tasks.entries()) {
    if (task.position !== index + 1) await tx.task.update({ where: { id: task.id }, data: { position: index + 1 } })
  }
}

function columnTasks(tx, projectId, status, exceptId) {
  return tx.task.findMany({
    where: { projectId, status, id: { not: exceptId } },
    orderBy: { position: 'asc' },
    select: { id: true, position: true },
  })
}

// US-14
tasksRouter.get('/tasks/:taskId', signedIn, async (req, res) => {
  const { task, membership } = await findTask(req.params.taskId, req.user.id)
  res.json(serializeTask(task, membership))
})

// US-15 and US-17: edit the fields that were sent. New assignees are notified.
tasksRouter.patch('/tasks/:taskId', signedIn, async (req, res) => {
  const { task, membership } = await findTask(req.params.taskId, req.user.id)
  if (!taskPermissions(task, membership).canEdit) throw forbidden('You do not have access to edit this task.')

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const { assigneeIds, ...fields } = await validateTaskFields(body, task.projectId, { partial: true })
  if ('isBlocked' in body) {
    if (body.isBlocked && task.status !== 'IN_PROGRESS') {
      throw invalid([{ field: 'isBlocked', message: 'Only tasks in progress can be flagged as blocked.' }])
    }
    fields.isBlocked = Boolean(body.isBlocked)
    fields.blockedReason = body.isBlocked ? String(body.blockedReason ?? '').trim() || null : null
  }

  const updated = await prisma.$transaction(async (tx) => {
    let added = []
    if (assigneeIds) {
      const current = task.assignees.map((assignee) => assignee.userId)
      added = assigneeIds.filter((userId) => !current.includes(userId))
      await tx.taskAssignee.deleteMany({ where: { taskId: task.id, userId: { notIn: assigneeIds } } })
      await tx.taskAssignee.createMany({ data: added.map((userId) => ({ taskId: task.id, userId })) })
    }
    const saved = await tx.task.update({ where: { id: task.id }, data: fields, include: withAssignees })
    await notifyAssigned(tx, { task: saved, userIds: added, actorId: req.user.id })
    return saved
  }, TRANSACTION_OPTIONS)

  res.json(serializeTask(updated, membership))
})

// US-16: move a card to a column and place (1 is the top). The other cards shift, and a task
// that leaves In Progress is no longer blocked. Answers every task, in board order.
tasksRouter.post('/tasks/:taskId/move', signedIn, async (req, res) => {
  const { task, membership } = await findTask(req.params.taskId, req.user.id)
  if (!taskPermissions(task, membership).canMove) throw forbidden('You do not have access to move this task.')
  const status = req.body?.status
  if (!STATUS_ORDER.includes(status)) throw invalid([{ field: 'status', message: 'Choose a status.' }])
  const position = Number.isInteger(req.body?.position) ? req.body.position : null
  const { projectId } = task

  const tasks = await prisma.$transaction(async (tx) => {
    await lockProject(tx, projectId)
    // Read again after the lock, in case another request moved or deleted it meanwhile.
    const current = await tx.task.findUnique({ where: { id: task.id }, select: { status: true } })
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'This task no longer exists. It may have been deleted.')

    const source = await columnTasks(tx, projectId, current.status, task.id)
    const target = status === current.status ? source : await columnTasks(tx, projectId, status, task.id)
    const index = Math.min(Math.max((position ?? target.length + 1) - 1, 0), target.length)
    target.splice(index, 0, { id: task.id, position: null })

    await tx.task.update({
      where: { id: task.id },
      data: { status, ...(status === 'IN_PROGRESS' ? {} : { isBlocked: false, blockedReason: null }) },
    })
    if (target !== source) await renumber(tx, source)
    await renumber(tx, target)
    return tx.task.findMany({ where: { projectId }, include: withAssignees })
  }, TRANSACTION_OPTIONS)

  tasks.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.position - b.position)
  res.json(tasks.map((item) => serializeTask(item, membership)))
})

// US-18: the owner and members with Edit all tasks access delete tasks.
tasksRouter.delete('/tasks/:taskId', signedIn, async (req, res) => {
  const { task, membership } = await findTask(req.params.taskId, req.user.id)
  if (!taskPermissions(task, membership).canDelete) throw forbidden('You need Edit all tasks access to delete tasks.')

  await prisma.$transaction(async (tx) => {
    await lockProject(tx, task.projectId)
    const current = await tx.task.findUnique({ where: { id: task.id }, select: { status: true } })
    if (!current) return
    await tx.task.delete({ where: { id: task.id } })
    await renumber(tx, await columnTasks(tx, task.projectId, current.status, task.id))
  }, TRANSACTION_OPTIONS)

  res.json({ id: task.id })
})
