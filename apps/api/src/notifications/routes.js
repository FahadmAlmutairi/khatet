// US-30 View my notifications.
// GET   /api/notifications                    newest first, with the unread count: { items, unreadCount }
// PATCH /api/notifications/:notificationId    marks one notification as read
// Item fields match the sample version in apps/web/src/api/mockServer.js.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { notFound } from '../lib/errors.js'
import { isUuid } from '../projects/access.js'

export const notificationsRouter = Router()

const signedIn = [requireAuth, requireUsername]

// The panel shows the most recent ones; the unread count still covers all of them.
const LIST_LIMIT = 50

const withNames = {
  actor: { select: { username: true } },
  project: { select: { name: true } },
  task: { select: { title: true } },
  invitation: { select: { status: true } },
}

function serializeNotification(notification) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    projectId: notification.projectId,
    actorId: notification.actorId,
    invitationId: notification.invitationId,
    taskId: notification.taskId,
    read: notification.read,
    createdAt: notification.createdAt,
    // The actor is null if their account was deleted.
    actorUsername: notification.actor?.username ?? 'unknown',
    projectName: notification.project.name,
    taskTitle: notification.task?.title ?? null,
    invitationStatus: notification.invitation?.status ?? null,
  }
}

notificationsRouter.get('/notifications', signedIn, async (req, res) => {
  const where = { userId: req.user.id }
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: withNames,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: LIST_LIMIT,
    }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ])
  res.json({ items: notifications.map(serializeNotification), unreadCount })
})

notificationsRouter.patch('/notifications/:notificationId', signedIn, async (req, res) => {
  const { notificationId } = req.params
  const gone = () => notFound('This notification no longer exists.')
  if (!isUuid(notificationId)) throw gone()

  // Only the recipient can mark it.
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, userId: req.user.id },
    data: { read: true },
  })
  if (count === 0) throw gone()

  const notification = await prisma.notification.findUnique({ where: { id: notificationId }, include: withNames })
  res.json(serializeNotification(notification))
})

// For the tasks routes (US-13, US-15): call inside the same transaction that saves the
// assignees, so each newly assigned member gets a TASK_ASSIGNED notification.
// The person making the change is not notified about their own action.
export function notifyAssigned(tx, { task, userIds, actorId }) {
  const data = userIds
    .filter((userId) => userId !== actorId)
    .map((userId) => ({ userId, type: 'TASK_ASSIGNED', projectId: task.projectId, taskId: task.id, actorId }))
  return data.length ? tx.notification.createMany({ data }) : null
}
