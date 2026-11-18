// US-31 AI project report routes. The AI call is faked, so these tests never need
// OPENAI_API_KEY and never spend credit.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { ApiError } from '../src/lib/errors.js'

vi.mock('../src/ai/reportClient.js', async (importOriginal) => ({
  ...(await importOriginal()),
  generateReport: vi.fn(),
}))

const { default: app } = await import('../src/app.js')
const { prisma } = await import('../src/db.js')
const { generateReport } = await import('../src/ai/reportClient.js')
const { PROMPT_VERSION } = await import('../src/ai/reportPrompt.js')
const { REPORT_INTERVAL_MS, REPORT_HISTORY_LIMIT } = await import('../src/reports/routes.js')
const { authHeader, createProject, createUser, hasTestDatabase, resetDatabase } = await import('./helpers.js')

const REPORT_TEXT = '## Progress summary\nHalf done.\n\n## Warnings\nNo warnings.\n\n## Suggestions\n- **Finish login**: Ali.'

describe.skipIf(!hasTestDatabase)('AI report: /api/projects/:projectId/reports', () => {
  let owner, sara, outsider, project

  beforeEach(async () => {
    await resetDatabase()
    owner = await createUser('owner_user')
    sara = await createUser('sara')
    outsider = await createUser('outsider')
    project = await createProject(owner, [{ user: sara, taskAccess: 'EDIT_ALL' }])
    generateReport.mockReset()
    generateReport.mockResolvedValue({
      text: REPORT_TEXT,
      model: 'test-model',
      durationMs: 1200,
      usage: { inputTokens: 600, outputTokens: 250 },
    })
  })
  afterAll(() => prisma.$disconnect())

  const generate = (as) => request(app).post(`/api/projects/${project.id}/reports`).set(authHeader(as))
  const list = (as) => request(app).get(`/api/projects/${project.id}/reports`).set(authHeader(as))
  const latest = (as) => request(app).get(`/api/projects/${project.id}/reports/latest`).set(authHeader(as))

  it('lets the owner generate a report from the project summary and saves it', async () => {
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: 'Build login',
        status: 'DONE',
        position: 1,
        createdById: owner.id,
        assignees: { create: [{ userId: sara.id }] },
      },
    })

    const res = await generate(owner)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      projectId: project.id,
      content: REPORT_TEXT,
      model: 'test-model',
      promptVersion: PROMPT_VERSION,
      createdBy: { id: owner.id, username: 'owner_user' },
    })
    expect(res.body.id).toEqual(expect.any(String))
    expect(new Date(res.body.createdAt).toString()).not.toBe('Invalid Date')

    // The AI gets the summary of this project's real data.
    const summary = generateReport.mock.calls[0][0]
    expect(summary).toMatchObject({ project: 'Graduation project', totalTasks: 1, percentDone: 100 })
    expect(await prisma.aiReport.count({ where: { projectId: project.id } })).toBe(1)
  })

  it('does not change any project data', async () => {
    const task = await prisma.task.create({
      data: { projectId: project.id, title: 'Draft', status: 'TODO', position: 1, createdById: owner.id },
    })
    await generate(owner).expect(201)

    const after = await prisma.task.findUnique({ where: { id: task.id } })
    expect(after.updatedAt).toEqual(task.updatedAt)
    expect(await prisma.activityEvent.count({ where: { projectId: project.id } })).toBe(0)
  })

  it('refuses members (403) and non-members (404) without calling the AI', async () => {
    const asMember = await generate(sara)
    expect(asMember.status).toBe(403)
    expect(asMember.body.error.code).toBe('FORBIDDEN')

    const asOutsider = await generate(outsider)
    expect(asOutsider.status).toBe(404)

    expect(generateReport).not.toHaveBeenCalled()
    expect(await prisma.aiReport.count()).toBe(0)
  })

  it('allows one report every 10 minutes and says when the next one is allowed', async () => {
    const first = await generate(owner).expect(201)

    const second = await generate(owner)
    expect(second.status).toBe(429)
    expect(second.body.error.code).toBe('REPORT_TOO_SOON')
    const expected = new Date(new Date(first.body.createdAt).getTime() + REPORT_INTERVAL_MS)
    expect(second.body.error.nextAllowedAt).toBe(expected.toISOString())
    expect(generateReport).toHaveBeenCalledTimes(1)

    // Ten minutes later the owner can generate again.
    await prisma.aiReport.update({
      where: { id: first.body.id },
      data: { createdAt: new Date(Date.now() - REPORT_INTERVAL_MS - 1000) },
    })
    await generate(owner).expect(201)
    expect(generateReport).toHaveBeenCalledTimes(2)
  })

  it('passes AI errors through with their code, saves nothing, and lets the owner retry at once', async () => {
    generateReport.mockRejectedValueOnce(new ApiError(504, 'AI_TIMEOUT', 'The AI report took too long. Try again.'))

    const failed = await generate(owner)
    expect(failed.status).toBe(504)
    expect(failed.body.error).toMatchObject({ code: 'AI_TIMEOUT', message: 'The AI report took too long. Try again.' })
    expect(await prisma.aiReport.count()).toBe(0)

    await generate(owner).expect(201)
  })

  it('lets every member read the latest report', async () => {
    const none = await latest(sara)
    expect(none.status).toBe(404)
    expect(none.body.error.code).toBe('NO_REPORT')

    await prisma.aiReport.create({
      data: {
        projectId: project.id,
        createdById: owner.id,
        content: 'Older report',
        model: 'test-model',
        promptVersion: PROMPT_VERSION,
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    })
    const created = await generate(owner).expect(201)

    const res = await latest(sara)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(created.body)
  })

  it('lists the project’s reports for every member, newest first, at most 20', async () => {
    const empty = await list(sara)
    expect(empty.status).toBe(200)
    expect(empty.body).toEqual({ reports: [] })

    const hourAgo = Date.now() - 60 * 60 * 1000
    await prisma.aiReport.createMany({
      data: Array.from({ length: REPORT_HISTORY_LIMIT + 2 }, (_, i) => ({
        projectId: project.id,
        createdById: owner.id,
        content: `Report ${i}`,
        model: 'test-model',
        promptVersion: PROMPT_VERSION,
        createdAt: new Date(hourAgo + i * 1000),
      })),
    })
    const newest = await generate(owner).expect(201)

    const res = await list(sara)
    expect(res.status).toBe(200)
    expect(res.body.reports).toHaveLength(REPORT_HISTORY_LIMIT)
    expect(res.body.reports[0]).toEqual(newest.body)
    expect(res.body.reports[1]).toMatchObject({ content: `Report ${REPORT_HISTORY_LIMIT + 1}`, createdBy: { username: 'owner_user' } })
  })

  it('hides reports from non-members', async () => {
    await generate(owner).expect(201)
    for (const res of [await latest(outsider), await list(outsider)]) {
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    }
  })
})
