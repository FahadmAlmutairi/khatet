import { errorMessage } from '../../api/errors.js'
import { useTaskActivity } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import { formatDueDate, formatTimestamp, priorityLabel, statusLabel } from '../../lib/domain.js'

const FIELD_LABELS = {
  status: 'Status',
  assignees: 'Assignees',
  priority: 'Priority',
  dueDate: 'Due date',
  blocked: 'Blocked flag',
}

function valueLabel(field, value) {
  if (field === 'status') return statusLabel(value)
  if (field === 'assignees') return value.join(', ')
  if (field === 'priority') return value ? priorityLabel(value) : 'No priority'
  if (field === 'dueDate') return value ? formatDueDate(value) : 'No due date'
  return value ? 'Blocked' : 'Not blocked'
}

export default function TaskActivity({ taskId }) {
  const activity = useTaskActivity(taskId)
  const events = [...(activity.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <section aria-labelledby="task-activity-heading" className="flex flex-col gap-3">
      <h3 id="task-activity-heading" className="text-sm font-medium text-body">Activity</h3>
      {activity.isPending && <p role="status" className="text-sm text-muted">Loading activity…</p>}
      {activity.isError && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-muted">
          <p>Activity could not be loaded. {errorMessage(activity.error)}</p>
          <Button variant="secondary" onClick={() => activity.refetch()}>Try again</Button>
        </div>
      )}
      {activity.data && events.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
      {events.length > 0 && (
        <ol aria-label="Task activity" className="flex flex-col divide-y divide-line rounded-card border border-line bg-white">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-body">{FIELD_LABELS[event.field] ?? event.field}</p>
                <p className="text-sm text-body">
                  {valueLabel(event.field, event.from)} <span aria-label="changed to">→</span> {valueLabel(event.field, event.to)}
                </p>
              </div>
              <p className="text-xs text-muted">
                <span>{event.actorUsername}</span>
                <span aria-hidden="true"> · </span>
                <time dateTime={event.createdAt}>{formatTimestamp(event.createdAt)}</time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
