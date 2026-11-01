// TF-14: the AI report summary and client. The OpenAI API is faked, so these tests
// never need OPENAI_API_KEY and never spend credit.
import { describe, it, expect, vi, afterEach } from 'vitest'
import OpenAI from 'openai'
import { summarizeProject } from '../src/ai/projectSummary.js'
import { generateReport, createOpenAIClient, DEFAULT_MODEL } from '../src/ai/reportClient.js'
import { REPORT_INSTRUCTIONS } from '../src/ai/reportPrompt.js'
import { sampleProjectData, sampleToday } from '../src/ai/sampleProject.js'

const fakeClient = (create) => ({ responses: { create: vi.fn(create) } })

describe('summarizeProject', () => {
  const summary = summarizeProject(sampleProjectData, sampleToday)

  it('counts tasks per status and the share done', () => {
    expect(summary.totalTasks).toBe(8)
    expect(summary.tasksByStatus).toEqual({ BACKLOG: 1, TODO: 2, IN_PROGRESS: 2, READY_FOR_REVIEW: 1, DONE: 2 })
    expect(summary.percentDone).toBe(25)
  })

  it('lists overdue, due-this-week and blocked tasks', () => {
    expect(summary.overdueTasks.map((t) => t.title)).toEqual(['Event list API'])
    expect(summary.dueThisWeek.map((t) => t.title)).toEqual(['Event details screen', 'Search events'])
    expect(summary.blockedTasks).toEqual([
      expect.objectContaining({
        title: 'Event list API',
        blockedReason: 'Waiting for the hosting account',
        daysSinceLastUpdate: 11,
      }),
    ])
  })

  it('shows each member’s workload', () => {
    expect(summary.memberLoad).toEqual([
      { member: 'ali_dev', role: 'OWNER', openTasks: 4, doneTasks: 1, overdueTasks: 1 },
      { member: 'sara_ui', role: 'MEMBER', openTasks: 1, doneTasks: 1, overdueTasks: 0 },
      { member: 'omar_qa', role: 'MEMBER', openTasks: 1, doneTasks: 0, overdueTasks: 0 },
    ])
  })

  it('handles an empty project', () => {
    const empty = summarizeProject({ project: { name: 'New' }, members: [], tasks: [] }, sampleToday)
    expect(empty.totalTasks).toBe(0)
    expect(empty.percentDone).toBe(0)
  })
})

describe('generateReport', () => {
  const summary = summarizeProject(sampleProjectData, sampleToday)

  it('sends the prompt and the summary, and returns the report', async () => {
    const client = fakeClient(async () => ({
      output_text: '  ## Progress summary\nGood.  ',
      model: 'test-model',
      usage: { input_tokens: 500, output_tokens: 120 },
    }))

    const report = await generateReport(summary, { client, model: 'test-model' })

    const request = client.responses.create.mock.calls[0][0]
    expect(request.model).toBe('test-model')
    expect(request.instructions).toBe(REPORT_INSTRUCTIONS)
    expect(request.input).toContain('"project": "Campus Events App"')
    expect(report).toMatchObject({
      text: '## Progress summary\nGood.',
      model: 'test-model',
      usage: { inputTokens: 500, outputTokens: 120 },
    })
    expect(report.durationMs).toBeGreaterThanOrEqual(0)
  })

  it.each([
    [{ name: 'APIConnectionTimeoutError' }, 504, 'AI_TIMEOUT'],
    [{ status: 429, code: 'insufficient_quota' }, 503, 'AI_QUOTA'],
    [{ status: 429 }, 429, 'AI_BUSY'],
    [{ status: 401 }, 503, 'AI_NOT_CONFIGURED'],
    [{ status: 500 }, 502, 'AI_FAILED'],
  ])('turns an OpenAI error %o into %i %s', async (openAiError, status, code) => {
    const client = fakeClient(async () => {
      throw Object.assign(new Error('OpenAI error'), openAiError)
    })
    await expect(generateReport(summary, { client })).rejects.toMatchObject({ status, code })
  })

  it('turns the real OpenAI timeout error into AI_TIMEOUT', async () => {
    const client = fakeClient(async () => {
      throw new OpenAI.APIConnectionTimeoutError()
    })
    await expect(generateReport(summary, { client })).rejects.toMatchObject({ status: 504, code: 'AI_TIMEOUT' })
  })

  it('uses the default model when OPENAI_MODEL is empty', async () => {
    const saved = process.env.OPENAI_MODEL
    process.env.OPENAI_MODEL = ''
    const client = fakeClient(async () => ({ output_text: 'Report' }))
    try {
      await generateReport(summary, { client })
    } finally {
      if (saved === undefined) delete process.env.OPENAI_MODEL
      else process.env.OPENAI_MODEL = saved
    }
    expect(client.responses.create.mock.calls[0][0].model).toBe(DEFAULT_MODEL)
  })

  it('rejects an empty answer', async () => {
    const client = fakeClient(async () => ({ output_text: '   ' }))
    await expect(generateReport(summary, { client })).rejects.toMatchObject({ code: 'AI_EMPTY_REPORT' })
  })
})

describe('createOpenAIClient', () => {
  const savedKey = process.env.OPENAI_API_KEY
  afterEach(() => {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = savedKey
  })

  it('refuses to start without OPENAI_API_KEY', () => {
    delete process.env.OPENAI_API_KEY
    expect(() => createOpenAIClient()).toThrow(expect.objectContaining({ code: 'AI_NOT_CONFIGURED' }))
  })
})
