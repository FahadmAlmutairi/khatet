import { useOutletContext } from 'react-router'
import { reportAvailable } from '../../api/config.js'
import { errorMessage } from '../../api/errors.js'
import { useGenerateReport, useLatestReport } from '../../api/hooks.js'
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
  useDocumentTitle('AI report', project.name)

  if (!reportAvailable) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-title font-bold text-body">AI report</h1>
        <p className="text-muted">The AI report is not available yet.</p>
      </section>
    )
  }

  const hasReport = Boolean(report.data)
  const generateButton = (
    <Button onClick={() => generate.mutate()} loading={generate.isPending} fullOnPhone>
      {hasReport ? 'Generate a new report' : 'Generate report'}
    </Button>
  )

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Breadcrumb items={crumbs} className="lg:hidden" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-title font-bold text-body">AI report</h1>
          <p className="text-sm text-muted">
            A progress summary, warnings and suggestions written from the tasks on the board.
          </p>
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
              {isOwner
                ? 'Generate a report to get a progress summary, warnings and suggestions from the tasks on the board. Every member of the project can read it.'
                : 'The project owner can generate one. It will show here for everyone in the project.'}
            </EmptyState>
          )}
          {hasReport && <ReportArticle report={report.data} />}
        </>
      )}
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
      <p className="pl-8 text-sm text-muted">
        {slow ? 'Still working. Reports take up to 30 seconds.' : 'This can take up to 30 seconds. You can keep this page open.'}
      </p>
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

function ReportArticle({ report }) {
  return (
    <article aria-labelledby="report-meta" className="flex flex-col gap-6 rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1 border-b border-line pb-4">
        <p id="report-meta" className="text-sm font-medium text-heading">
          Generated {formatTimestamp(report.createdAt)} by {report.createdBy?.username ?? 'unknown'}
        </p>
        <p className="text-sm text-muted">This report never changes your project.</p>
      </div>
      <ReportContent content={report.content} />
    </article>
  )
}
