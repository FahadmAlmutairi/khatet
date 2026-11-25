import { useId, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router'
import { apiReady, phaseSettingsReady, phasesAvailable } from '../../api/config.js'
import { errorMessage } from '../../api/errors.js'
import { usePhases, useTasks } from '../../api/hooks.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import StatusIcon from '../../components/StatusIcon.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { formatDueDate, statusLabel } from '../../lib/domain.js'
import { buildTimeline, formatRange, isOverdue, timelineList } from './timelineData.js'

const VIEWS = [
  ['timeline', 'Timeline'],
  ['list', 'List'],
]

// Phones start on the list: a scale of months does not fit 375px (UI/UX guidelines, Timeline and phases).
function defaultView() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'timeline'
  return window.matchMedia('(min-width: 1024px)').matches ? 'timeline' : 'list'
}

// US-29: phases and dated tasks in date order with a marker for today. Tasks without a due date
// are not shown. Read from the phases route (US-20) and the tasks the board already loads.
export default function TimelinePage() {
  const { project } = useOutletContext()
  const tasks = useTasks(project.id)
  const phases = usePhases(project.id, { enabled: phasesAvailable })
  const [params, setParams] = useSearchParams()
  const [fallbackView] = useState(defaultView)
  const view = params.get('view') === 'list' || params.get('view') === 'timeline' ? params.get('view') : fallbackView
  useDocumentTitle('Timeline', project.name)

  function chooseView(next) {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        updated.set('view', next)
        return updated
      },
      { replace: true },
    )
  }

  const phaseList = phasesAvailable ? phases.data : []
  const loading = tasks.isPending || (phasesAvailable && phases.isPending)
  const failed = tasks.isError ? tasks : phasesAvailable && phases.isError ? phases : null
  const canManagePhases = project.role === 'OWNER' && phasesAvailable && phaseSettingsReady && apiReady.projectSettings

  return (
    <section className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-bold text-body">Timeline</h1>
          <p className="text-sm text-muted">Phases and tasks with a due date, in date order.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canManagePhases && (
            <Link
              to={`/projects/${project.id}/settings#phases`}
              className="inline-flex min-h-11 items-center rounded-control px-2 text-sm font-medium text-heading underline underline-offset-2 hover:text-action"
            >
              Manage phases
            </Link>
          )}
          <SegmentedControl label="View" options={VIEWS} value={view} onChange={chooseView} />
        </div>
      </div>

      {loading && <LoadingState label="Loading the timeline" />}
      {failed && (
        <ErrorState title="The timeline could not be loaded" message={errorMessage(failed.error)} onRetry={() => failed.refetch()} />
      )}
      {!loading && !failed && (
        <TimelineBody projectId={project.id} tasks={tasks.data} phases={phaseList ?? []} view={view} canManagePhases={canManagePhases} />
      )}
    </section>
  )
}

function TimelineBody({ projectId, tasks, phases, view, canManagePhases }) {
  const timeline = buildTimeline({ phases, tasks })

  if (timeline.isEmpty) {
    return (
      <EmptyState
        title="Nothing on the timeline yet"
        action={
          <Link
            to={`/projects/${projectId}/board`}
            className="inline-flex min-h-11 items-center rounded-control border border-line bg-white px-[18px] text-label font-medium text-heading hover:bg-surface"
          >
            Open the board
          </Link>
        }
      >
        {canManagePhases
          ? 'Give tasks a due date on the board, or add phases in Project settings, and they appear here.'
          : 'Tasks appear here once they have a due date.'}
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {view === 'timeline' ? (
        <TimelineChart projectId={projectId} timeline={timeline} />
      ) : (
        <TimelineList projectId={projectId} months={timelineList({ phases, tasks })} />
      )}
      {timeline.undatedCount > 0 && (
        <p className="text-sm text-muted">
          {timeline.undatedCount} {timeline.undatedCount === 1 ? 'task has' : 'tasks have'} no due date, so{' '}
          {timeline.undatedCount === 1 ? 'it is' : 'they are'} not shown.
        </p>
      )}
    </div>
  )
}

function taskLabel(task, today) {
  const late = isOverdue(task, today)
  return `${task.title}, due ${formatDueDate(task.dueDate)}, ${statusLabel(task.status)}${task.isBlocked ? ', blocked' : ''}${late ? ', overdue' : ''}`
}

function LateTag() {
  return <span className="shrink-0 rounded-full bg-priority-high-bg px-2 py-0.5 text-xs font-medium text-priority-high-text">Overdue</span>
}

// The visual timeline: a label column and a track with a month scale. Phases are bars and tasks
// are diamonds on their due date, one row each, so labels never overlap. The track scrolls
// sideways when the window is narrow; the labels stay put.
function TimelineChart({ projectId, timeline }) {
  const titleId = useId()
  const todayLeft = timeline.position(timeline.today, { middle: true })
  // Each month gets at least 8rem; on a wide window the track grows to fill the card.
  const columns = `minmax(14rem, 20rem) minmax(${Math.max(timeline.months.length * 8, 32)}rem, 1fr)`

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <p id={titleId} className="sr-only">
        Timeline from {timeline.months[0].label} to {timeline.months.at(-1).label}. Today is {formatDueDate(timeline.today)}.
      </p>
      <div className="overflow-x-auto" role="region" aria-labelledby={titleId} tabIndex={0}>
        <div className="grid w-full min-w-fit" style={{ gridTemplateColumns: columns }}>
          {/* Month scale */}
          <div className="sticky left-0 z-20 border-b border-line bg-white px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase">
            Phase and task
          </div>
          <div className="relative h-10 border-b border-line" aria-hidden="true">
            {timeline.months.map((month) => (
              <span
                key={month.key}
                className="absolute inset-y-0 flex items-center border-l border-line pl-2 text-xs font-medium text-muted"
                style={{ left: `${month.left}%`, width: `${month.width}%` }}
              >
                {month.label}
                {month.year && <span className="ml-1 font-normal">{month.year}</span>}
              </span>
            ))}
            <span
              className="absolute top-1 -translate-x-1/2 rounded-full bg-attention px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ left: `${todayLeft}%` }}
            >
              Today
            </span>
          </div>

          {timeline.groups.map((group) => (
            <TimelineGroup key={group.phase?.id ?? 'none'} projectId={projectId} group={group} timeline={timeline} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Month lines and the today line behind each row's track.
function TrackBackground({ timeline }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {timeline.months.map((month) => (
        <span key={month.key} className="absolute inset-y-0 border-l border-line/70" style={{ left: `${month.left}%` }} />
      ))}
      <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-attention/70" style={{ left: `${timeline.position(timeline.today, { middle: true })}%` }} />
    </span>
  )
}

function TimelineGroup({ projectId, group, timeline }) {
  const { phase, tasks } = group
  const phaseLate = phase && phase.endDate < timeline.today
  return (
    <>
      <div className="sticky left-0 z-10 flex min-h-12 flex-col justify-center gap-0.5 border-b border-line bg-surface px-4 py-2">
        <span className="text-sm font-semibold break-words text-heading">{phase ? phase.name : 'No phase'}</span>
        <span className="text-xs text-muted">
          {phase ? formatRange(phase.startDate, phase.endDate) : 'Tasks not linked to a phase'}
          {phase && ` · ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
        </span>
      </div>
      <div className="relative min-h-12 border-b border-line bg-surface/60">
        <TrackBackground timeline={timeline} />
        {phase && (
          <span
            aria-hidden="true"
            className={`absolute top-1/2 h-6 -translate-y-1/2 rounded-full border ${
              phaseLate ? 'border-line bg-surface-subtle/70' : 'border-[#668a66]/50 bg-priority-low-bg'
            }`}
            style={{ left: `${timeline.position(phase.startDate)}%`, width: `max(${timeline.span(phase.startDate, phase.endDate)}%, 0.5rem)` }}
          />
        )}
      </div>

      {tasks.map((task) => {
        const late = isOverdue(task, timeline.today)
        return (
          <TaskRow key={task.id} projectId={projectId} task={task} late={late} timeline={timeline} />
        )
      })}
      {phase && tasks.length === 0 && (
        <>
          <div className="sticky left-0 z-10 border-b border-line bg-white px-4 py-2.5 pl-7 text-sm text-muted">No dated tasks yet</div>
          <div className="relative border-b border-line">
            <TrackBackground timeline={timeline} />
          </div>
        </>
      )}
    </>
  )
}

function TaskRow({ projectId, task, late, timeline }) {
  const left = timeline.position(task.dueDate, { middle: true })
  const status = task.isBlocked ? 'BLOCKED' : task.status
  return (
    <>
      <div className="sticky left-0 z-10 border-b border-line bg-white">
        <Link
          to={`/projects/${projectId}/board?task=${task.id}`}
          aria-label={taskLabel(task, timeline.today)}
          className="row-hover flex min-h-11 items-center gap-2 py-2 pr-3 pl-7 text-sm text-body"
        >
          <StatusIcon status={status} />
          <span className="min-w-0 flex-1 truncate" title={task.title}>
            {task.title}
          </span>
        </Link>
      </div>
      <div className="relative min-h-11 border-b border-line" aria-hidden="true">
        <TrackBackground timeline={timeline} />
        <span
          className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${
            task.status === 'DONE' ? 'bg-status-done' : late ? 'bg-blocked' : 'bg-action'
          }`}
          style={{ left: `${left}%` }}
        />
        <span
          className={`absolute top-1/2 -translate-y-1/2 pl-3 text-xs whitespace-nowrap ${late ? 'font-medium text-blocked' : 'text-muted'}`}
          style={{ left: `${left}%` }}
        >
          {late ? 'Overdue · ' : task.status === 'DONE' ? 'Done · ' : ''}
          {formatDueDate(task.dueDate, { short: true })}
        </span>
      </div>
    </>
  )
}

// The list view: one date order, grouped by month, with a line where today falls.
function TimelineList({ projectId, months }) {
  const today = months.flatMap((month) => month.items).find((item) => item.kind === 'today')?.date
  return (
    <div className="flex flex-col gap-5">
      {months.map((month) => (
        <section key={month.key} aria-labelledby={`timeline-month-${month.key}`} className="flex flex-col gap-2">
          <h2 id={`timeline-month-${month.key}`} className="text-xs font-semibold tracking-wide text-muted uppercase">
            {month.heading}
          </h2>
          <ol className="list-enter flex flex-col gap-2">
            {month.items.map((item) => (
              <ListItem key={`${item.kind}-${item.id}`} projectId={projectId} item={item} today={today} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function ListItem({ projectId, item, today }) {
  if (item.kind === 'today') {
    return (
      <li className="flex items-center gap-3 py-1" aria-label={`Today, ${formatDueDate(item.date)}`}>
        <span aria-hidden="true" className="rounded-full bg-attention px-2.5 py-0.5 text-xs font-semibold text-white">
          Today · {formatDueDate(item.date, { short: true })}
        </span>
        <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-attention/60" />
      </li>
    )
  }
  if (item.kind === 'phase') {
    return (
      <li className="flex items-center gap-3 rounded-[10px] border border-[#668a66]/40 bg-priority-low-bg/70 px-3 py-2.5">
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-priority-low-text">Phase</span>
        <span className="min-w-0 flex-1 text-sm font-semibold break-words text-heading">{item.phase.name}</span>
        <span className="shrink-0 text-xs text-priority-low-text">{formatRange(item.phase.startDate, item.phase.endDate)}</span>
      </li>
    )
  }
  const { task } = item
  const late = isOverdue(task, today)
  const status = task.isBlocked ? 'BLOCKED' : task.status
  return (
    <li>
      <Link
        to={`/projects/${projectId}/board?task=${task.id}`}
        aria-label={taskLabel(task, today)}
        className="card-lift flex items-center gap-3 rounded-[10px] border border-line bg-white px-3 py-2.5 transition-colors hover:bg-nav-active"
      >
        <span className={`w-14 shrink-0 text-xs font-medium ${late ? 'text-blocked' : 'text-muted'}`}>{formatDueDate(task.dueDate, { short: true })}</span>
        <StatusIcon status={status} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium break-words text-body">{task.title}</span>
          <span className="truncate text-xs text-muted">
            {statusLabel(task.status)}
            {item.phaseName && ` · ${item.phaseName}`}
          </span>
        </span>
        {late && <LateTag />}
      </Link>
    </li>
  )
}
