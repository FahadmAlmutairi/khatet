import { useActivity } from '../../api/hooks.js'
import Avatar from '../../components/Avatar.jsx'
import Button from '../../components/ui/Button.jsx'
import { describeTaskActivity, activityTime } from './describeActivity.js'

// Task details / Activity (Figma R46): who changed this task, newest first.
export default function TaskActivity({ task }) {
  const activity = useActivity(task.projectId, { taskId: task.id })
  const events = activity.data?.pages.flatMap((page) => page.events) ?? []

  return (
    <section aria-labelledby={`activity-${task.id}`} className="flex flex-col gap-2">
      <h3 id={`activity-${task.id}`} className="text-sm font-medium text-body">
        Activity
      </h3>
      {activity.isPending && <p className="text-sm text-muted">Loading…</p>}
      {activity.isError && (
        <p className="text-sm text-blocked">
          The activity could not be loaded.{' '}
          <button type="button" onClick={() => activity.refetch()} className="font-medium underline">
            Try again
          </button>
        </p>
      )}
      {activity.isSuccess && events.length === 0 && <p className="text-sm text-muted">No changes yet.</p>}
      {events.length > 0 && (
        <ol className="flex flex-col divide-y divide-line">
          {events.map((event) => {
            const { text, more } = describeTaskActivity(event)
            return (
              <li key={event.id} className="flex items-start gap-3 py-2.5">
                <Avatar username={event.actorUsername} size="xs" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-sm text-body">
                    <span className="font-semibold text-heading">{event.actorUsername}</span> {text}
                  </p>
                  {more.map((line) => (
                    <p key={line} className="text-sm text-muted">
                      {line}
                    </p>
                  ))}
                </div>
                <time dateTime={event.createdAt} className="shrink-0 text-xs text-muted">
                  {activityTime(event.createdAt)}
                </time>
              </li>
            )
          })}
        </ol>
      )}
      {activity.hasNextPage && (
        <Button variant="secondary" className="self-start" onClick={() => activity.fetchNextPage()} loading={activity.isFetchingNextPage}>
          Show older
        </Button>
      )}
    </section>
  )
}
