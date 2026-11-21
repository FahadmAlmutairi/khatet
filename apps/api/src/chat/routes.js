// US-24 Use project chat. Every project member can read and send messages.
// GET  /api/projects/:projectId/messages               the latest messages, oldest first
// GET  /api/projects/:projectId/messages?after=:id     only the messages sent after that one
// POST /api/projects/:projectId/messages               body: { "text": "Hello team" }
// US-25: a message can mention tasks of the same project with the token #[task:<taskId>].
// Every message carries `references: [{ taskId, title }]`, with `title: null` once the task is deleted.
// TR-05: a saved message is also sent to the project's Socket.IO room as `message:new`. The web app
// asks again every 3 seconds with `after` only while the socket is not connected
// (docs/api-contract.md, Chat contract; NFR-09).
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { invalid } from '../lib/errors.js'
import { findMembership, isUuid } from '../projects/access.js'
import { emitToProject } from '../realtime/socket.js'

export const chatRouter = Router()

const signedIn = [requireAuth, requireUsername]

export const MAX_TEXT_LENGTH = 2000
// The panel opens with the latest 100 messages, and each refresh returns at most 100 new ones.
export const LIST_LIMIT = 100

const withAuthor = { author: { select: { username: true } } }

const TASK_TOKEN = /#\[task:([^\]\s]*)\]/g

// The task IDs mentioned in a message, each once, in the order they first appear.
export function referencedTaskIds(text) {
  return [...new Set([...text.matchAll(TASK_TOKEN)].map((match) => match[1]))]
}

// The current title of every task the messages mention, read in one query.
// A task that was deleted (or never was in this project) has no entry.
async function loadTaskTitles(projectId, messages) {
  const ids = [...new Set(messages.flatMap((message) => referencedTaskIds(message.text)))].filter(isUuid)
  if (ids.length === 0) return new Map()
  const tasks = await prisma.task.findMany({ where: { projectId, id: { in: ids } }, select: { id: true, title: true } })
  return new Map(tasks.map((task) => [task.id, task.title]))
}

function serializeMessage(message, titles) {
  return {
    id: message.id,
    projectId: message.projectId,
    authorId: message.authorId,
    authorUsername: message.author.username,
    text: message.text,
    references: referencedTaskIds(message.text).map((taskId) => ({ taskId, title: titles.get(taskId) ?? null })),
    createdAt: message.createdAt,
  }
}

async function serializeMessages(projectId, messages) {
  const titles = await loadTaskTitles(projectId, messages)
  return messages.map((message) => serializeMessage(message, titles))
}

chatRouter.get('/projects/:projectId/messages', signedIn, async (req, res) => {
  const { projectId } = await findMembership(req.params.projectId, req.user.id)
  const { after } = req.query

  if (after === undefined) {
    const latest = await prisma.chatMessage.findMany({
      where: { projectId },
      include: withAuthor,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: LIST_LIMIT,
    })
    return res.json(await serializeMessages(projectId, latest.reverse()))
  }

  // The cursor must be a message in this project, so another project's IDs reveal nothing.
  const cursor = isUuid(after)
    ? await prisma.chatMessage.findFirst({ where: { id: after, projectId }, select: { id: true, createdAt: true } })
    : null
  if (!cursor) throw invalid([{ field: 'after', message: 'This message is not in the project chat.' }])

  const newer = await prisma.chatMessage.findMany({
    where: {
      projectId,
      OR: [{ createdAt: { gt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { gt: cursor.id } }],
    },
    include: withAuthor,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: LIST_LIMIT,
  })
  res.json(await serializeMessages(projectId, newer))
})

chatRouter.post('/projects/:projectId/messages', signedIn, async (req, res) => {
  const { projectId } = await findMembership(req.params.projectId, req.user.id)
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  if (!text) throw invalid([{ field: 'text', message: 'Write a message first.' }])
  if (text.length > MAX_TEXT_LENGTH) {
    throw invalid([{ field: 'text', message: `Keep the message under ${MAX_TEXT_LENGTH} characters.` }])
  }

  // Every mentioned task must be in this project, so a message cannot point at another project's task.
  const taskIds = referencedTaskIds(text)
  if (taskIds.length > 0) {
    const found = taskIds.every(isUuid)
      ? await prisma.task.count({ where: { projectId, id: { in: taskIds } } })
      : -1
    if (found !== taskIds.length) {
      throw invalid([{ field: 'text', message: 'A mentioned task is not in this project. It may have been deleted.' }])
    }
  }

  const message = await prisma.chatMessage.create({
    data: { projectId, authorId: req.user.id, text },
    include: withAuthor,
  })
  const [saved] = await serializeMessages(projectId, [message])
  emitToProject(projectId, 'message:new', saved)
  res.status(201).json(saved)
})
