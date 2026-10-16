// US-01 Create an account and US-02 Sign in, backend part.
// Supabase Auth sends and checks the 6-digit email code; this API keeps the Khatet
// account and its username.
// GET   /api/me   the signed-in user (created on the first request after sign-up)
// PATCH /api/me   body: { "username": "sara" }
import { Router } from 'express'
import { prisma } from '../db.js'
import { invalid } from '../lib/errors.js'
import { requireAuth } from './requireAuth.js'

export const authRouter = Router()

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
const CHANGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

export function serializeUser(user) {
  return { id: user.id, email: user.email, username: user.username }
}

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(serializeUser(req.user))
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const username = String(req.body?.username ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
  if (!USERNAME_PATTERN.test(username)) {
    throw invalid([{ field: 'username', message: 'Use 3 to 20 letters, numbers or underscores.' }])
  }

  const user = req.user
  if (user.username === username) return res.json(serializeUser(user))

  // Choosing the first username is free; changing it is allowed once every 30 days (US-03).
  if (user.username && user.usernameChangedAt && Date.now() - user.usernameChangedAt.getTime() < CHANGE_INTERVAL_MS) {
    throw invalid([{ field: 'username', message: 'You can change your username once every 30 days.' }])
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { username, usernameChangedAt: user.username ? new Date() : null },
    })
    res.json(serializeUser(updated))
  } catch (error) {
    if (error.code === 'P2002') {
      throw invalid([{ field: 'username', message: `${username} is taken. Try another username.` }])
    }
    throw error
  }
})
