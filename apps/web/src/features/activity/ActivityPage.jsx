import { useId, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useActivity, useMembers, useTasks } from '../../api/hooks.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Avatar from '../../components/Avatar.jsx'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Button from '../../components/ui/Button.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { describeActivity, dayLabel } from './describeActivity.js'

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

// The kinds of change the log can show (?kind= on the API), as tabs like Figma's Project Activity.
const KINDS = [
  ['', 'All'],
  ['task', 'Tasks'],
  ['member', 'Members'],
  ['project', 'Project'],
]

// The project log: every change a member made, newest first. Entries stay after a task is
// deleted or a member leaves, so the owner can see what each person did.
export default function ActivityPage() {
  const { project } = useOutletContext()
  const crumbs = useBreadcrumb()
  const members = useMembers(project.id)
  const tasks = useTasks(project.id)
  useDocumentTitle('Project log', project.name)

  return (
    <section className="flex w-full max-w-3xl flex-col gap-6">
      <Breadcrumb items={crumbs} className="lg:hidden" />
      <ProjectLog
        projectId={project.id}
        heading={<h1 className="text-title font-bold text-body">Project log</h1>}
        memberIds={members.isSuccess ? new Set(members.data.members.map((member) => member.userId)) : null}
        liveTaskIds={new Set((tasks.data ?? []).map((task) => task.id))}
      />
    </section>
  )
}

// The log with its person filter and kind tabs. Also used for an archived project, where
// memberIds is null and nothing links to the board (liveTaskIds is empty).
export function ProjectLog({ projectId, heading, memberIds = null, liveTaskIds = new Set() }) {
  const [actorId, setActorId] = useState('')
  const [kind, setKind] = useState('')
  const activity = useActivity(projectId, { actorId: actorId || undefined, kind: kind || undefined, keepPrevious: true })
  const filterId = useId()

  const pages = activity.data?.pages ?? []
  const events = pages.flatMap((page) => page.events)
  const actors = pages[0]?.actors ?? []
  const days = groupByDay(events)
  const chosen = actors.find((actor) => actor.id === actorId)

  // While a new filter loads, the old list stays and dims. When the new list arrives, the key
  // below changes and it fades in, row after row.
  const filterKey = `${kind}|${actorId}`
  const [shownKey, setShownKey] = useState(filterKey)
  if (!activity.isPlaceholderData && shownKey !== filterKey) setShownKey(filterKey)
  const switching = activity.isPlaceholderData

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {heading}
        {actors.length > 0 && (
          <div className="flex items-center gap-2 max-sm:w-full">
            <label htmlFor={filterId} className="shrink-0 text-sm font-medium text-body">
              Person
            </label>
            <select
              id={filterId}
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              className="min-h-11 flex-1 rounded-control border border-input bg-white px-3 text-base text-body sm:min-h-10 sm:min-w-44 sm:text-sm"
            >
              <option value="">Everyone</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.username}
                  {memberIds && !memberIds.has(actor.id) ? ' (former member)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <SegmentedControl label="Kind of change" options={KINDS} value={kind} onChange={setKind} className="-mt-2" />

      {activity.isPending && <LoadingState label="Loading the project log" />}
      {activity.isError && (
        <ErrorState
          title="The project log could not be loaded"
          message={errorMessage(activity.error)}
          onRetry={() => activity.refetch()}
        />
      )}
      {activity.isSuccess && (
        <div
          key={shownKey}
          aria-busy={switching}
          className={`log-entries flex flex-col gap-6 ${switching ? 'log-entries-switching' : ''}`}
        >
          {events.length === 0 && (
            <EmptyState title={kind || chosen ? 'No matching changes' : 'Nothing in the log yet'}>
              {kind || chosen ? null : 'Changes to tasks and members will show here.'}
            </EmptyState>
          )}

          {days.map(({ key, label, items }) => (
            <section key={key} aria-labelledby={`day-${key}`} className="flex flex-col gap-2">
              <h2 id={`day-${key}`} className="text-sm font-semibold text-muted">
                {label}
              </h2>
              <ol className="list-enter flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {items.map((event) => (
                  <li key={event.id} className="row-hover flex items-start gap-3 px-4 py-3">
                    <span aria-hidden="true" className="-my-1 flex">
                      <Avatar username={event.actorUsername} size="sm" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-sm text-body">
                        <EventText event={event} projectId={projectId} taskExists={liveTaskIds.has(event.taskId)} />
                      </p>
                      {describeActivity(event).more.map((line) => (
                        <p key={line} className="text-sm text-muted">
                          {line}
                        </p>
                      ))}
                    </div>
                    <time dateTime={event.createdAt} className="shrink-0 text-xs leading-5 text-muted tabular-nums">
                      {timeFormat.format(new Date(event.createdAt))}
                    </time>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {activity.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => activity.fetchNextPage()} loading={activity.isFetchingNextPage}>
            Load older entries
          </Button>
        </div>
      )}
    </>
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
