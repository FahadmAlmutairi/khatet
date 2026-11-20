import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { reportAvailable } from '../../api/config.js'
import { errorMessage } from '../../api/errors.js'
import { useActivity, useLatestReport, useMe, useMembers, useTasks } from '../../api/hooks.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import { AvatarStack } from '../../components/Avatar.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { CalendarIcon, HistoryIcon, ReportIcon, WarningIcon } from '../../components/icons.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { dateFromToday, dueLine, formatDueDate, formatTimestamp } from '../../lib/domain.js'
import { projectStats } from '../../lib/projectStats.js'
import { activityTime, describeActivity } from '../activity/describeActivity.js'
import { reportParts } from '../report/parseReport.js'

const UPCOMING_LIMIT = 5
const ATTENTION_LIMIT = 4
const ACTIVITY_LIMIT = 5

// US-28: the project at a glance (Figma: Overview / Desktop / Approved, 694:1201).
// Everything is counted from the board, the project log and the latest report.
export default function OverviewPage() {
  const { project } = useOutletContext()
  const tasks = useTasks(project.id)
  const members = useMembers(project.id)
  useDocumentTitle('Overview', project.name)

  const usernames = new Map((members.data?.members ?? []).map((member) => [member.userId, member.username]))
  const memberCount = members.data?.members.length

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold break-words text-body">{project.name}</h1>
        {memberCount !== undefined && (
          <p className="text-sm text-muted">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </p>
        )}
      </div>

      {tasks.isPending && <LoadingState label="Loading the overview" />}
      {tasks.isError && (
        <ErrorState title="The overview could not be loaded" message={errorMessage(tasks.error)} onRetry={() => tasks.refetch()} />
      )}
      {tasks.data && (
        <>
          {/* Two independent columns on desktop, so a short card never leaves a gap under it.
              On phones the columns dissolve and Needs attention comes right after Upcoming work. */}
          <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
            <div className="contents lg:col-span-3 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
              <UpcomingWork projectId={project.id} tasks={tasks.data} usernames={usernames} />
              <RecentActivity projectId={project.id} className="max-lg:order-1" />
            </div>
            <div className="contents lg:col-span-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
              <NeedsAttention projectId={project.id} tasks={tasks.data} usernames={usernames} />
              {reportAvailable && <LatestReport projectId={project.id} className="max-lg:order-2" />}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// Each card header starts with a small tinted icon, so the cards are told apart at a glance.
const CARD_ICONS = {
  upcoming: { icon: <CalendarIcon />, tone: 'bg-priority-low-bg text-priority-low-text' },
  attention: { icon: <WarningIcon />, tone: 'bg-priority-high-bg text-blocked' },
  activity: { icon: <HistoryIcon />, tone: 'bg-nav-active text-action' },
  report: { icon: <ReportIcon />, tone: 'bg-surface-subtle/60 text-heading' },
}

function Card({ title, icon, action, className = '', children }) {
  const badge = CARD_ICONS[icon]
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {badge && (
            <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-[9px] ${badge.tone}`}>
              {badge.icon}
            </span>
          )}
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function CardLink({ to, children }) {
  return (
    <Link to={to} className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-medium text-heading underline-offset-2 hover:underline">
      {children} <span aria-hidden="true">→</span>
    </Link>
  )
}

function Chip({ children }) {
  return <span className="shrink-0 whitespace-nowrap rounded-full bg-priority-high-bg px-2.5 py-1 text-xs font-medium text-priority-high-text">{children}</span>
}

function TaskRow({ projectId, task, usernames, line, alert = false, pill = true, badge = null, lead = null }) {
  const assignees = task.assigneeIds.map((id) => ({ id, username: usernames.get(id) ?? 'unknown' }))
  return (
    <li>
      <Link
        to={`/projects/${projectId}/board?task=${task.id}`}
        className="card-lift flex items-center gap-3 rounded-[10px] bg-surface px-3 py-2.5 transition-colors hover:bg-nav-active"
      >
        {lead}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium break-words text-body max-sm:line-clamp-2 sm:truncate">{task.title}</span>
          <span className={`truncate text-xs ${alert ? 'text-blocked' : 'text-muted'}`}>{line}</span>
        </span>
        {pill && <StatusPill status={task.status} className="max-sm:hidden" />}
        {badge}
        {assignees.length > 0 && <AvatarStack users={assignees} max={2} />}
      </Link>
    </li>
  )
}

function names(task, usernames) {
  return task.assigneeIds.map((id) => usernames.get(id) ?? 'unknown').join(', ')
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// A small calendar page: month in red, day in dark text, on white. Tasks without a date get an empty page.
function DateTile({ date }) {
  const [, month, day] = date ? date.split('-').map(Number) : []
  return (
    <span aria-hidden="true" className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-line bg-white py-1 leading-none">
      {date ? (
        <>
          <span className="text-[10px] font-bold tracking-wide text-blocked">{MONTHS[month - 1]}</span>
          <span className="mt-0.5 text-base font-semibold text-heading">{day}</span>
        </>
      ) : (
        <span className="grid h-[26px] place-items-center text-muted">
          <CalendarIcon />
        </span>
      )}
    </span>
  )
}

// Upcoming tasks under "Today", "This week", "Later" and "No due date", nearest first.
function dueGroups(tasks, now = new Date()) {
  const today = dateFromToday(0, now)
  const weekEnd = dateFromToday(7, now)
  const groups = [
    { label: 'Today', test: (date) => date === today },
    { label: 'This week', test: (date) => date > today && date <= weekEnd },
    { label: 'Later', test: (date) => date > weekEnd },
    { label: 'No due date', test: (date) => !date },
  ]
  return groups
    .map(({ label, test }) => ({ label, tasks: tasks.filter((task) => test(task.dueDate)) }))
    .filter((group) => group.tasks.length > 0)
}

// Open tasks by due date, for the team or for me (Figma: Upcoming work, Project / My work).
function UpcomingWork({ projectId, tasks, usernames }) {
  const me = useMe()
  const [mine, setMine] = useState(false)
  const open = tasks
    .filter((task) => task.status !== 'DONE' && task.status !== 'BACKLOG')
    // Blocked and overdue tasks are listed under Needs attention instead.
    .filter((task) => !task.isBlocked && !dueLine(task.dueDate, task.status)?.overdue)
    .filter((task) => !mine || task.assigneeIds.includes(me.data?.id))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const shown = open.slice(0, UPCOMING_LIMIT)
  // The tasks left out above, counted the same way as the Needs attention card.
  const stats = projectStats(tasks)
  const flagged = [...new Set([...stats.blocked, ...stats.overdue])]
  const elsewhere = flagged.filter((task) => !mine || task.assigneeIds.includes(me.data?.id)).length

  const toggle = (
    <SegmentedControl
      label="Show"
      options={[
        [false, 'Project'],
        [true, 'My work'],
      ]}
      value={mine}
      onChange={setMine}
    />
  )

  return (
    <Card title="Upcoming work" icon="upcoming" action={toggle}>
      {shown.length === 0 && elsewhere > 0 ? (
        <p className="text-sm text-muted">
          {elsewhere} {mine ? 'of your tasks' : 'open tasks'} {elsewhere === 1 ? 'is' : 'are'} under Needs attention.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">{mine ? 'Nothing assigned to you is open.' : 'No open tasks.'}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {dueGroups(shown).map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{group.label}</h3>
              <ul className="list-enter flex flex-col gap-2">
                {group.tasks.map((task) => {
                  const due = dueLine(task.dueDate, task.status)
                  return (
                    <TaskRow
                      key={task.id}
                      projectId={projectId}
                      task={task}
                      usernames={usernames}
                      lead={<DateTile date={task.dueDate} />}
                      line={[due?.text ?? 'No due date', names(task, usernames)].filter(Boolean).join(' · ')}
                    />
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      {shown.length > 0 && elsewhere > 0 && <p className="text-sm text-muted">{elsewhere} more under Needs attention</p>}
      <CardLink to={`/projects/${projectId}/board`}>Open the board</CardLink>
    </Card>
  )
}

// Blocked and overdue tasks across the project (Figma: Needs attention).
function NeedsAttention({ projectId, tasks, usernames }) {
  const stats = projectStats(tasks)
  const flagged = [...new Set([...stats.blocked, ...stats.overdue])]
  const shown = flagged.slice(0, ATTENTION_LIMIT)
  return (
    <Card title={flagged.length ? `Needs attention · ${flagged.length}` : 'Needs attention'} icon="attention">
      {shown.length === 0 ? (
        <p className="text-sm text-muted">Nothing is blocked or overdue.</p>
      ) : (
        <ul className="list-enter flex flex-col gap-2">
          {shown.map((task) => {
            const detail = task.isBlocked
              ? task.blockedReason
              : `Due ${formatDueDate(task.dueDate, { short: true })}`
            return (
              <TaskRow
                key={task.id}
                projectId={projectId}
                task={task}
                usernames={usernames}
                pill={false}
                line={[names(task, usernames), detail].filter(Boolean).join(' · ')}
                badge={<Chip>{task.isBlocked ? 'Blocked' : 'Overdue'}</Chip>}
              />
            )
          })}
        </ul>
      )}
      {flagged.length > shown.length && (
        <CardLink to={`/projects/${projectId}/board`}>View all {flagged.length} on the board</CardLink>
      )}
    </Card>
  )
}

function LatestReport({ projectId, className }) {
  const report = useLatestReport(projectId)
  const parts = report.data ? reportParts(report.data.content) : null
  const summary = parts?.summary[0]
  const warnings = parts?.warnings.length ?? 0
  return (
    <Card
      title="Latest report"
      icon="report"
      className={className}
      action={warnings > 0 && <Chip>{warnings} {warnings === 1 ? 'warning' : 'warnings'}</Chip>}
    >
      {report.isPending && <p className="text-sm text-muted">Loading…</p>}
      {report.isError && <p className="text-sm text-blocked">{errorMessage(report.error)}</p>}
      {report.isSuccess && !report.data && <p className="text-sm text-muted">No report yet.</p>}
      {report.data && (
        <>
          <p className="text-xs text-muted">Generated {formatTimestamp(report.data.createdAt)}</p>
          {summary && <p className="line-clamp-3 text-sm leading-relaxed text-body">{summary.replace(/\*\*/g, '')}</p>}
        </>
      )}
      <CardLink to={`/projects/${projectId}/report`}>{report.data ? 'View report' : 'Open Reports'}</CardLink>
    </Card>
  )
}

function RecentActivity({ projectId, className }) {
  const activity = useActivity(projectId)
  const events = (activity.data?.pages[0]?.events ?? []).slice(0, ACTIVITY_LIMIT)
  return (
    <Card title="Recent activity" icon="activity" className={className}>
      {activity.isPending && <p className="text-sm text-muted">Loading…</p>}
      {activity.isError && <p className="text-sm text-blocked">{errorMessage(activity.error)}</p>}
      {activity.isSuccess && events.length === 0 && <p className="text-sm text-muted">No changes yet.</p>}
      {events.length > 0 && (
        <ol className="list-enter flex flex-col divide-y divide-line">
          {events.map((event) => {
            const { before, after } = describeActivity(event)
            return (
              <li key={event.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                <time dateTime={event.createdAt} className="shrink-0 text-xs whitespace-nowrap text-muted sm:w-24 sm:pt-0.5">
                  {activityTime(event.createdAt)}
                </time>
                <p className="text-sm text-body">
                  <span className="font-semibold text-heading">{event.actorUsername}</span> {before}
                  {event.taskTitle && ` “${event.taskTitle}”`}
                  {after && ` ${after}`}
                </p>
              </li>
            )
          })}
        </ol>
      )}
      <CardLink to={`/projects/${projectId}/log`}>View the project log</CardLink>
    </Card>
  )
}
