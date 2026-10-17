import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { errorHandler, requestId, routeNotFound } from './lib/errors.js'
import { authRouter } from './auth/routes.js'
import { projectsRouter } from './projects/routes.js'
import { membersRouter } from './members/routes.js'
import { notificationsRouter } from './notifications/routes.js'
import { tasksRouter } from './tasks/routes.js'

const app = express()

app.use(requestId)
app.use(cors({ origin: config.corsOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', authRouter)
// Before projectsRouter, whose sign-in check runs for every /api/projects path.
app.use('/api', membersRouter)
app.use('/api', notificationsRouter)
app.use('/api', tasksRouter)
app.use('/api/projects', projectsRouter)

app.use(routeNotFound)
app.use(errorHandler)

export default app
