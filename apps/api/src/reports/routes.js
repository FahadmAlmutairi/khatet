// US-31 AI project report (docs/api-contract.md, AI report contract, Sprint 3 shape).
// GET  /api/projects/:projectId/reports          every member: { reports }, newest first, at most 20
// GET  /api/projects/:projectId/reports/latest   every member: the newest report, or 404 NO_REPORT
// POST /api/projects/:projectId/reports          owner only: generates a report and answers 201 with it
// Sprint 3 answers in one request; the AI call times out after 30 seconds (src/ai/reportClient.js).
// A report only reads project data. Nothing here changes tasks, members or settings.
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireUsername } from '../auth/requireAuth.js'
import { ApiError } from '../lib/errors.js'
import { findMembership, findOwnerMembership } from '../projects/access.js'
import { loadProjectData } from '../ai/loadProjectData.js'
import { summarizeProject } from '../ai/projectSummary.js'
import { generateReport } from '../ai/reportClient.js'
import { PROMPT_VERSION } from '../ai/reportPrompt.js'

export const reportsRouter = Router()

const signedIn = [requireAuth, requireUsername]

// Cost guard: one report per project every 10 minutes. Failed attempts are not saved,
// so they do not count and the owner can press Try again at once.
export const REPORT_INTERVAL_MS = 10 * 60 * 1000

// The Reports page lists earlier reports so members can open one (docs/api-contract.md).
export const REPORT_HISTORY_LIMIT = 20

// Projects with a report being written right now, so a double click does not pay for two.
// In memory is enough: the API runs as one Render instance.
const running = new Set()

const withAuthor = { createdBy: { select: { id: true, username: true } } }

function serializeReport(report) {
  return {
    id: report.id,
    projectId: report.projectId,
    content: report.content,
    model: report.model,
    promptVersion: report.promptVersion,
    createdAt: report.createdAt,
    createdBy: report.createdBy ? { id: report.createdBy.id, username: report.createdBy.username } : null,
  }
}

const latestFor = (projectId) =>
  prisma.aiReport.findFirst({
    where: { projectId },
    include: withAuthor,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })

reportsRouter.get('/projects/:projectId/reports', signedIn, async (req, res) => {
  const { projectId } = await findMembership(req.params.projectId, req.user.id)
  const reports = await prisma.aiReport.findMany({
    where: { projectId },
    include: withAuthor,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: REPORT_HISTORY_LIMIT,
  })
  res.json({ reports: reports.map(serializeReport) })
})

reportsRouter.get('/projects/:projectId/reports/latest', signedIn, async (req, res) => {
  const { projectId } = await findMembership(req.params.projectId, req.user.id)
  const report = await latestFor(projectId)
  if (!report) throw new ApiError(404, 'NO_REPORT', 'No report has been generated for this project yet.')
  res.json(serializeReport(report))
})

reportsRouter.post('/projects/:projectId/reports', signedIn, async (req, res) => {
  const { projectId } = await findOwnerMembership(
    req.params.projectId,
    req.user.id,
    'Only the project owner can generate a report.',
  )

  const previous = await prisma.aiReport.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (previous) {
    const nextAllowedAt = new Date(previous.createdAt.getTime() + REPORT_INTERVAL_MS)
    if (nextAllowedAt > new Date()) {
      throw new ApiError(
        429,
        'REPORT_TOO_SOON',
        'A report was generated less than 10 minutes ago. Try again later.',
        [],
        { nextAllowedAt: nextAllowedAt.toISOString() },
      )
    }
  }

  if (running.has(projectId)) {
    throw new ApiError(409, 'REPORT_IN_PROGRESS', 'A report for this project is already being written. Wait a moment.')
  }
  running.add(projectId)
  try {
    const data = await loadProjectData(projectId)
    const summary = summarizeProject(data)
    const result = await generateReport(summary)

    const report = await prisma.aiReport.create({
      data: {
        projectId,
        createdById: req.user.id,
        content: result.text,
        model: result.model,
        promptVersion: PROMPT_VERSION,
      },
      include: withAuthor,
    })
    // Duration and tokens go to the Render logs for NFR-17 and the cost record (TR-04).
    console.log(
      `[${req.id}] AI report ${report.id}: ${result.durationMs} ms, ` +
        `${result.usage.inputTokens ?? '?'} tokens in, ${result.usage.outputTokens ?? '?'} out`,
    )
    res.status(201).json(serializeReport(report))
  } catch (error) {
    // AI errors already have a safe message and code; log the original cause for debugging.
    if (error instanceof ApiError && error.cause) console.error(`[${req.id}] ${error.code}`, error.cause)
    throw error
  } finally {
    running.delete(projectId)
  }
})
