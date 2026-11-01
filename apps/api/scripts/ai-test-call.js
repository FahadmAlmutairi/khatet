// TF-14 / TR-04 test call: builds a project summary, asks the AI for a report,
// and prints the report, the time it took and the tokens used.
// Run in apps\api:
//   node scripts/ai-test-call.js --sample      made-up project, no database needed
//   node scripts/ai-test-call.js               first project in your DEV database
//   node scripts/ai-test-call.js <projectId>   one project in your DEV database
import '../src/config.js'
import { summarizeProject } from '../src/ai/projectSummary.js'
import { generateReport, AI_TIMEOUT_MS } from '../src/ai/reportClient.js'
import { PROMPT_VERSION } from '../src/ai/reportPrompt.js'
import { sampleProjectData, sampleToday } from '../src/ai/sampleProject.js'

const PROD_REF = 'ejawkffamzsoyabzigjm' // only seeded test data may go to the AI (test plan)

async function getSummary(arg) {
  if (arg === '--sample') return summarizeProject(sampleProjectData, sampleToday)

  if ((process.env.DATABASE_URL ?? '').includes(PROD_REF)) {
    throw new Error('DATABASE_URL points to production. Use your dev database or --sample.')
  }
  const { prisma } = await import('../src/db.js')
  const { loadProjectData } = await import('../src/ai/loadProjectData.js')
  try {
    const projectId = arg ?? (await prisma.project.findFirst({ select: { id: true } }))?.id
    if (!projectId) throw new Error('Your dev database has no projects. Try --sample.')
    const data = await loadProjectData(projectId)
    if (!data) throw new Error(`No project with id ${projectId}.`)
    return summarizeProject(data)
  } finally {
    await prisma.$disconnect()
  }
}

try {
  const summary = await getSummary(process.argv[2])
  console.log(`Project: ${summary.project} (${summary.totalTasks} tasks), prompt version ${PROMPT_VERSION}`)
  console.log('Asking the AI...\n')

  const report = await generateReport(summary)
  console.log(report.text)
  console.log('\n---')
  console.log(`Model: ${report.model}`)
  console.log(`Time: ${(report.durationMs / 1000).toFixed(1)} s (limit ${AI_TIMEOUT_MS / 1000} s)`)
  console.log(`Tokens: ${report.usage.inputTokens} in, ${report.usage.outputTokens} out`)
} catch (error) {
  console.error(`\nFailed: ${error.code ?? ''} ${error.message}`)
  if (error.cause) console.error(`OpenAI said: ${error.cause.status ?? ''} ${error.cause.message ?? error.cause}`)
  process.exitCode = 1
}
