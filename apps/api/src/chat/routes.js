// US-24 Use project chat. Every project member can read and send messages.
// GET  /api/projects/:projectId/messages               the latest messages, oldest first
// GET  /api/projects/:projectId/messages?after=:id     only the messages sent after that one
// POST /api/projects/:projectId/messages               body: { "text": "Hello team" }
// The web app asks again every 3 seconds with `after` until Socket.IO replaces refreshing
// in Sprint 3 (docs/api-contract.md, Chat; NFR-09).
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { invalid } from '../lib/errors.js'
import { findMembership, isUuid } from '../projects/access.js'

export const chatRouter = Router()

const signedIn = [requireAuth, requireUsername]

export const MAX_TEXT_LENGTH = 2000
// The panel opens with the latest 100 messages, and each refresh returns at most 100 new ones.
export const LIST_LIMIT = 100

const withAuthor = { author: { select: { username: true } } }

function serializeMessage(message) {
  return {
    id: message.id,
    projectId: message.projectId,
    authorId: message.authorId,
    authorUsername: message.author.username,
    text: message.text,
    createdAt: message.createdAt,
  }
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
    return res.json(latest.reverse().map(serializeMessage))
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
  res.json(newer.map(serializeMessage))
})

chatRouter.post('/projects/:projectId/messages', signedIn, async (req, res) => {
  const { projectId } = await findMembership(req.params.projectId, req.user.id)
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  if (!text) throw invalid([{ field: 'text', message: 'Write a message first.' }])
  if (text.length > MAX_TEXT_LENGTH) {
    throw invalid([{ field: 'text', message: `Keep the message under ${MAX_TEXT_LENGTH} characters.` }])
  }

  const message = await prisma.chatMessage.create({
    data: { projectId, authorId: req.user.id, text },
    include: withAuthor,
  })
  res.status(201).json(serializeMessage(message))
})
