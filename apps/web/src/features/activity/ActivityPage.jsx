import { useId, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useActivity, useMembers, useTasks } from '../../api/hooks.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Button from '../../components/ui/Button.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { describeActivity, dayLabel } from './describeActivity.js'

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

// The project log: every change a member made, newest first. Entries stay after a task is
// deleted or a member leaves, so the owner can see what each person did.
export default function ActivityPage() {
  const { project } = useOutletContext()
  const crumbs = useBreadcrumb()
  const [actorId, setActorId] = useState('')
  const activity = useActivity(project.id, { actorId: actorId || undefined })
  const members = useMembers(project.id)
  const tasks = useTasks(project.id)
  const filterId = useId()
  useDocumentTitle('Project log', project.name)

  const pages = activity.data?.pages ?? []
  const events = pages.flatMap((page) => page.events)
  const actors = pages[0]?.actors ?? []
  const memberIds = new Set((members.data?.members ?? []).map((member) => member.userId))
  const liveTaskIds = new Set((tasks.data ?? []).map((task) => task.id))
  const days = groupByDay(events)
  const chosen = actors.find((actor) => actor.id === actorId)

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Breadcrumb items={crumbs} className="lg:hidden" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-title font-bold text-body">Project log</h1>
        {actors.length > 0 && (
          <div className="flex flex-col gap-1.5 max-sm:w-full">
            <label htmlFor={filterId} className="text-sm font-medium text-body">
              Person
            </label>
            <select
              id={filterId}
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              className="min-h-11 rounded-lg border border-line bg-white px-3 text-base text-body sm:min-w-48 sm:text-sm"
            >
              <option value="">Everyone</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.username}
                  {members.isSuccess && !memberIds.has(actor.id) ? ' (former member)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activity.isPending && <LoadingState label="Loading the project log" />}
      {activity.isError && (
        <ErrorState
          title="The project log could not be loaded"
          message={errorMessage(activity.error)}
          onRetry={() => activity.refetch()}
        />
      )}
      {activity.isSuccess && events.length === 0 && (
        <EmptyState title="Nothing in the log yet">
          {chosen ? `${chosen.username} has not changed anything in this project.` : 'Changes to tasks and members will show here.'}
        </EmptyState>
      )}

      {days.map(({ key, label, items }) => (
        <section key={key} aria-labelledby={`day-${key}`} className="flex flex-col gap-2">
          <h2 id={`day-${key}`} className="text-sm font-semibold text-muted">
            {label}
          </h2>
          <ol className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
            {items.map((event) => (
              <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-nav-active text-xs font-semibold text-heading"
                >
                  {event.actorUsername.charAt(0).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-sm text-body">
                    <EventText event={event} projectId={project.id} taskExists={liveTaskIds.has(event.taskId)} />
                  </p>
                  {describeActivity(event).more.map((line) => (
                    <p key={line} className="text-sm text-muted">
                      {line}
                    </p>
                  ))}
                </div>
                <time dateTime={event.createdAt} className="shrink-0 text-xs text-muted">
                  {timeFormat.format(new Date(event.createdAt))}
                </time>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {activity.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => activity.fetchNextPage()} loading={activity.isFetchingNextPage}>
            Load older entries
          </Button>
        </div>
      )}
    </section>
  )
}

// "sara moved “Fix CSV errors” from To Do to In Progress". The task title links to the task
// while it is still on the board.
function EventText({ event, projectId, taskExists }) {
  const { before, after } = describeActivity(event)
  return (
    <>
      <span className="font-semibold text-heading">{event.actorUsername}</span> {before}
      {event.taskTitle && (
        <>
          {' '}
          {taskExists ? (
            <Link to={`/projects/${projectId}/board?task=${event.taskId}`} className="font-medium text-heading underline">
              “{event.taskTitle}”
            </Link>
          ) : (
            <span className="font-medium text-heading">“{event.taskTitle}”</span>
          )}
        </>
      )}
      {after && ` ${after}`}
    </>
  )
}

function groupByDay(events) {
  const days = []
  for (const event of events) {
    const date = new Date(event.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const last = days.at(-1)
    if (last?.key === key) last.items.push(event)
    else days.push({ key, label: dayLabel(date), items: [event] })
  }
  return days
}
