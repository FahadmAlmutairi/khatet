import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.js'
import { errorHandler, requestId, routeNotFound } from './lib/errors.js'
import { authRouter } from './auth/routes.js'
import { projectsRouter } from './projects/routes.js'
import { membersRouter } from './members/routes.js'
import { notificationsRouter } from './notifications/routes.js'
import { tasksRouter } from './tasks/routes.js'
import { chatRouter } from './chat/routes.js'

const app = express()

// Render puts one proxy in front of the app, so the client's address is the first hop (used by the rate limits).
app.set('trust proxy', 1)
app.disable('x-powered-by')

// Limits on writes, so chat, invitations and username checks cannot be flooded (review M11).
// Tests send many requests in a row, so the limits are off there.
const limit = (limitPerMinute) =>
  rateLimit({
    windowMs: 60_000,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test' || req.method === 'GET' || req.method === 'OPTIONS',
    handler: (req, res) =>
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a minute and try again.', fieldErrors: [], requestId: req.id },
      }),
  })

app.use(requestId)
app.use(helmet())
app.use(cors({ origin: config.corsOrigins }))
app.use(express.json())
app.use('/api', limit(120))
app.use(['/api/projects/:projectId/invitations', '/api/me'], limit(20))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', authRouter)
// Before projectsRouter, whose sign-in check runs for every /api/projects path.
app.use('/api', membersRouter)
app.use('/api', notificationsRouter)
app.use('/api', tasksRouter)
app.use('/api', chatRouter)
app.use('/api/projects', projectsRouter)

app.use(routeNotFound)
app.use(errorHandler)

export default app
