import { useOutletContext } from 'react-router'
import { reportAvailable } from '../../api/config.js'
import { errorMessage } from '../../api/errors.js'
import { useGenerateReport, useLatestReport, useTasks } from '../../api/hooks.js'
import { InfoIcon, SparkleIcon } from '../../components/icons.jsx'
import { projectStats } from '../../lib/projectStats.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Button, { Spinner } from '../../components/ui/Button.jsx'
import { EmptyState, ErrorState, LoadingState, Notice } from '../../components/ui/States.jsx'
import { useTakingLong } from '../../components/ui/useTakingLong.js'
import { formatTimestamp } from '../../lib/domain.js'
import ReportContent from './ReportContent.jsx'

// US-31: the owner generates an AI report and every member reads the latest one.
// The report only reads the project; nothing on this page changes tasks, dates or people.
export default function ReportPage() {
  const { project } = useOutletContext()
  const crumbs = useBreadcrumb()
  const isOwner = project.role === 'OWNER'
  const report = useLatestReport(project.id, { enabled: reportAvailable })
  const generate = useGenerateReport(project.id)
  useDocumentTitle('Reports', project.name)

  if (!reportAvailable) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-title font-bold text-body">Reports</h1>
        <p className="text-muted">Reports are not available yet.</p>
      </section>
    )
  }

  const hasReport = Boolean(report.data)
  const generateButton = (
    <Button onClick={() => generate.mutate()} loading={generate.isPending} fullOnPhone>
      <SparkleIcon />
      {hasReport ? 'Generate new report' : 'Generate report'}
    </Button>
  )

  return (
    <section className="flex w-full max-w-4xl flex-col gap-6">
      <Breadcrumb items={crumbs} className="lg:hidden" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-bold text-body">Reports</h1>
          {hasReport && (
            <p id="report-meta" className="text-sm text-muted">
              Generated {formatTimestamp(report.data.createdAt)} by {report.data.createdBy?.username ?? 'unknown'}
            </p>
          )}
        </div>
        {isOwner && hasReport && !generate.isPending && generateButton}
      </div>

      {generate.isPending && <Generating />}
      {generate.isError && <GenerateError error={generate.error} onRetry={() => generate.mutate()} />}

      {!generate.isPending && (
        <>
          {report.isPending && <LoadingState label="Loading the report" />}
          {report.isError && (
            <ErrorState title="The report could not be loaded" message={errorMessage(report.error)} onRetry={() => report.refetch()} />
          )}
          {report.isSuccess && !hasReport && (
            <EmptyState title="No report yet" action={isOwner ? generateButton : undefined}>
              {isOwner ? null : 'The project owner can generate one.'}
            </EmptyState>
          )}
          {hasReport && (
            <article aria-labelledby="report-meta" className="flex flex-col gap-4">
              <ReportContent content={report.data.content} snapshot={<Snapshot projectId={project.id} />} />
              <p className="flex items-center gap-2 text-xs text-muted">
                <InfoIcon />
                The AI can be wrong. It never changes your project.
              </p>
            </article>
          )}
        </>
      )}
    </section>
  )
}

// Figma: AI report / Project snapshot. Counted from the board now, so it is always current.
function Snapshot({ projectId }) {
  const tasks = useTasks(projectId)
  if (!tasks.data) return null
  const stats = projectStats(tasks.data)
  const tiles = [
    { label: 'Done', value: stats.done },
    { label: 'In progress', value: stats.byStatus.IN_PROGRESS },
    { label: 'Ready for review', value: stats.byStatus.READY_FOR_REVIEW },
    { label: 'Blocked', value: stats.blocked.length, alert: true },
    { label: 'Overdue', value: stats.overdue.length, alert: true },
  ]
  return (
    <section aria-labelledby="snapshot-title" className="flex flex-col gap-2">
      <h2 id="snapshot-title" className="text-sm font-semibold text-heading">
        On the board now
      </h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col-reverse gap-1 rounded-xl border border-line bg-white px-3.5 py-2.5 max-sm:last:col-span-2 sm:px-4 sm:py-3">
            <dt className="text-xs text-muted">{tile.label}</dt>
            <dd className={`text-lg font-semibold sm:text-xl ${tile.alert && tile.value > 0 ? 'text-blocked' : 'text-heading'}`}>{tile.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// NFR-17: the report comes back within 30 seconds, so the wait says so from the start.
function Generating() {
  const slow = useTakingLong(true, 15_000)
  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl border border-line bg-white p-6">
      <div className="flex items-center gap-3 font-medium text-heading">
        <Spinner className="size-5" />
        Writing the report…
      </div>
      {slow && <p className="pl-8 text-sm text-muted">Still working. Reports take up to 30 seconds.</p>}
    </div>
  )
}

function GenerateError({ error, onRetry }) {
  if (error?.code === 'REPORT_TOO_SOON') {
    const next = error.nextAllowedAt ? formatTimestamp(error.nextAllowedAt) : null
    return (
      <div role="alert">
        <Notice tone="warning">
          A report was generated less than 10 minutes ago.{' '}
          {next ? `You can generate the next one after ${next}.` : 'Try again in a few minutes.'}
        </Notice>
      </div>
    )
  }
  // AI_TIMEOUT, AI_BUSY, AI_QUOTA, AI_FAILED and the rest come with a message that is safe to show.
  return <ErrorState title="The report could not be generated" message={errorMessage(error)} onRetry={onRetry} />
}
