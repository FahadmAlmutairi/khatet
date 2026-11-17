// The project log.
// GET /api/projects/:projectId/activity   every member can read it, newest first
//   ?actorId=<userId>   only the changes this person made, also after they left the project
//   ?taskId=<taskId>    only the changes to this task, also after it was deleted
//   ?before=<eventId>   the next page, from the nextCursor of the previous answer
//   ?limit=1..100       events per page, 50 by default
// Answers { events, nextCursor, actors }. actors lists everyone who appears in the log,
// for the person filter, including former members.
// The log only records changes; nothing here changes project data.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { invalid } from '../lib/errors.js'
import { findMembership, isUuid } from '../projects/access.js'

export const activityRouter = Router()

function serializeEvent(event) {
  return {
    id: event.id,
    projectId: event.projectId,
    type: event.type,
    actorId: event.actorId,
    actorUsername: event.actorUsername,
    taskId: event.taskId,
    taskTitle: event.taskTitle,
    details: event.details,
    createdAt: event.createdAt,
  }
}

activityRouter.get('/projects/:projectId/activity', requireAuth, requireUsername, async (req, res) => {
  const { projectId } = await findMembership(req.params.projectId, req.user.id)
  const { actorId, taskId, before } = req.query

  const errors = []
  if (actorId !== undefined && !isUuid(actorId)) errors.push({ field: 'actorId', message: 'Choose a person.' })
  if (taskId !== undefined && !isUuid(taskId)) errors.push({ field: 'taskId', message: 'Choose a task.' })
  if (before !== undefined && !isUuid(before)) errors.push({ field: 'before', message: 'Use the nextCursor value.' })
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.push({ field: 'limit', message: 'Use a limit from 1 to 100.' })
  }
  if (errors.length) throw invalid(errors)

  const where = { projectId, ...(actorId ? { actorId } : {}), ...(taskId ? { taskId } : {}) }
  // A cursor from another project or filter is ignored, so it cannot reveal other rows.
  const cursorRow = before ? await prisma.activityEvent.findFirst({ where: { ...where, id: before } }) : null

  const rows = await prisma.activityEvent.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursorRow ? { cursor: { id: cursorRow.id }, skip: 1 } : {}),
  })
  const events = rows.slice(0, limit)

  // The newest username of each person in the log.
  const actorRows = await prisma.activityEvent.findMany({
    where: { projectId, actorId: { not: null } },
    distinct: ['actorId'],
    orderBy: [{ actorId: 'asc' }, { createdAt: 'desc' }],
    select: { actorId: true, actorUsername: true },
  })
  const actors = actorRows
    .map((row) => ({ id: row.actorId, username: row.actorUsername }))
    .sort((a, b) => a.username.localeCompare(b.username))

  res.json({
    events: events.map(serializeEvent),
    nextCursor: rows.length > limit ? events.at(-1).id : null,
    actors,
  })
})
