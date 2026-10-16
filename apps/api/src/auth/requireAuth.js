// Checks the "Authorization: Bearer <token>" header on every protected request
// and puts the signed-in Khatet user on req.user. Every protected route uses it.
import { prisma } from '../db.js'
import { ApiError, unauthenticated } from '../lib/errors.js'
import { verifyToken } from './verifyToken.js'

export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) throw unauthenticated('Sign in to continue.')

  const identity = await verifyToken(token)
  if (!identity) throw unauthenticated()

  req.user = await findOrCreateUser(identity)
  next()
}

// A new user must choose a username before using projects (US-01).
export function requireUsername(req, res, next) {
  if (!req.user.username) {
    throw new ApiError(403, 'USERNAME_REQUIRED', 'Choose a username before using projects.')
  }
  next()
}

// The first request after sign-up creates the Khatet account (username still empty).
async function findOrCreateUser({ authId, email }) {
  const existing = await prisma.user.findUnique({ where: { authId } })
  if (existing) return existing
  try {
    return await prisma.user.create({ data: { authId, email } })
  } catch (error) {
    // Two first requests at the same moment: the other one created it.
    if (error.code === 'P2002') {
      const created = await prisma.user.findUnique({ where: { authId } })
      if (created) return created
      throw new ApiError(409, 'EMAIL_IN_USE', 'Another account already uses this email address.')
    }
    throw error
  }
}
