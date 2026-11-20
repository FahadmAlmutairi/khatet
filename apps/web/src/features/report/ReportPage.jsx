import { useId, useState } from 'react'
import { useOutletContext } from 'react-router'
import { reportAvailable } from '../../api/config.js'
import { errorMessage } from '../../api/errors.js'
import { useGenerateReport, useReports, useTasks } from '../../api/hooks.js'
import { InfoIcon, SparkleIcon } from '../../components/icons.jsx'
import { projectStats } from '../../lib/projectStats.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import Button, { Spinner } from '../../components/ui/Button.jsx'
import { EmptyState, ErrorState, LoadingState, Notice } from '../../components/ui/States.jsx'
import { useTakingLong } from '../../components/ui/useTakingLong.js'
import { formatTimestamp } from '../../lib/domain.js'
import ReportContent from './ReportContent.jsx'

// US-31: the owner generates an AI report and every member reads it, newest first, with the
// earlier reports one click away (Figma: AI Reports / Saved reports, 268:436).
// The report only reads the project; nothing on this page changes tasks, dates or people.
export default function ReportPage() {
  const { project } = useOutletContext()
  const isOwner = project.role === 'OWNER'
  const reports = useReports(project.id, { enabled: reportAvailable })
  const generate = useGenerateReport(project.id)
  const [selectedId, setSelectedId] = useState(null)
  const historyId = useId()
  useDocumentTitle('Reports', project.name)

  if (!reportAvailable) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-title font-bold text-body">Reports</h1>
        <p className="text-muted">Reports are not available yet.</p>
      </section>
    )
  }

  const list = reports.data ?? []
  const shown = list.find((item) => item.id === selectedId) ?? list[0]
  const hasHistory = list.length > 1
  const generateButton = (
    <Button
      onClick={() => generate.mutate(undefined, { onSuccess: () => setSelectedId(null) })}
      loading={generate.isPending}
      fullOnPhone
    >
      <SparkleIcon />
      {shown ? 'Generate new report' : 'Generate report'}
    </Button>
  )

  return (
    <section className={`flex w-full flex-col gap-6 ${hasHistory ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-bold text-body">Reports</h1>
          {shown && (
            <p id="report-meta" className="text-sm text-muted">
              Generated {formatTimestamp(shown.createdAt)} by {shown.createdBy?.username ?? 'unknown'}
            </p>
          )}
        </div>
        {isOwner && shown && !generate.isPending && generateButton}
      </div>

      {generate.isPending && <Generating />}
      {generate.isError && <GenerateError error={generate.error} onRetry={() => generate.mutate()} />}

      {!generate.isPending && (
        <>
          {reports.isPending && <LoadingState label="Loading the report" />}
          {reports.isError && (
            <ErrorState title="The report could not be loaded" message={errorMessage(reports.error)} onRetry={() => reports.refetch()} />
          )}
          {reports.isSuccess && !shown && (
            <EmptyState title="No report yet" action={isOwner ? generateButton : undefined}>
              {isOwner ? null : 'The project owner can generate one.'}
            </EmptyState>
          )}
          {shown && (
            <div className={hasHistory ? 'grid gap-6 lg:grid-cols-[15rem_minmax(0,48rem)] lg:items-start' : ''}>
              {hasHistory && (
                <ReportHistory id={historyId} reports={list} selected={shown} onSelect={setSelectedId} />
              )}
              <article aria-labelledby="report-meta" className="flex min-w-0 flex-col gap-4">
                <ReportContent
                  content={shown.content}
                  snapshot={shown.id === list[0].id ? <Snapshot projectId={project.id} /> : null}
                />
                <p className="flex items-center gap-2 text-xs text-muted">
                  <InfoIcon />
                  The AI can be wrong. It never changes your project.
                </p>
              </article>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function reportLabel(report, index) {
  return `${formatTimestamp(report.createdAt)}${index === 0 ? ' · Latest' : ''}`
}

// Earlier reports: a list beside the report on wide screens, a select above it on phones.
function ReportHistory({ id, reports, selected, onSelect }) {
  return (
    <nav aria-labelledby={`${id}-title`} className="flex flex-col gap-2">
      <h2 id={`${id}-title`} className="text-sm font-semibold text-heading">
        Reports · {reports.length}
      </h2>
      <label htmlFor={`${id}-select`} className="sr-only">
        Choose a report
      </label>
      <select
        id={`${id}-select`}
        value={selected.id}
        onChange={(event) => onSelect(event.target.value)}
        className="min-h-11 rounded-control border border-input bg-white px-3 text-base text-body lg:hidden"
      >
        {reports.map((report, index) => (
          <option key={report.id} value={report.id}>
            {reportLabel(report, index)}
          </option>
        ))}
      </select>
      <ul className="list-enter hidden flex-col gap-1.5 lg:flex">
        {reports.map((report, index) => {
          const current = report.id === selected.id
          return (
            <li key={report.id}>
              <button
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => onSelect(report.id)}
                className={`card-lift flex w-full flex-col gap-0.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                  current ? 'border-[#668a66] bg-nav-active' : 'border-line bg-white hover:bg-surface'
                }`}
              >
                <span className="text-sm font-medium text-body">
                  {formatTimestamp(report.createdAt)}
                  {index === 0 && <span className="font-normal text-muted"> · Latest</span>}
                </span>
                <span className="text-xs text-muted">by {report.createdBy?.username ?? 'unknown'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
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
