import { formatDueDate, formatShortDate, priorityLabel, statusLabel, taskAccessLabel } from '../../lib/domain.js'

const FIELD_LABELS = {
  title: 'title',
  priority: 'priority',
  dueDate: 'due date',
  blockedReason: 'blocked reason',
  phase: 'phase',
  startDate: 'start date',
  endDate: 'end date',
}

function list(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function fieldValue(field, value) {
  if (field === 'priority') return priorityLabel(value)
  if (field === 'dueDate' || field === 'startDate' || field === 'endDate') return value ? formatDueDate(value) : 'no date'
  if (field === 'phase') return value ? `“${value}”` : 'no phase'
  return value ? `“${value}”` : 'nothing'
}

// One line per change in an edit, for example "Priority: Low to High".
export function changeLines(changes = []) {
  return changes.map((change) => {
    if (change.field === 'description') return 'Changed the description'
    if (change.field === 'isBlocked') return change.to ? 'Flagged as blocked' : 'Cleared the blocked flag'
    if (change.field === 'assignees') {
      const parts = []
      if (change.added.length) parts.push(`added ${list(change.added)}`)
      if (change.removed.length) parts.push(`removed ${list(change.removed)}`)
      return `Assignees: ${parts.join(', ')}`
    }
    if (change.field === 'name') return `Name: “${change.from}” to “${change.to}”`
    const label = FIELD_LABELS[change.field] ?? change.field
    const name = label.charAt(0).toUpperCase() + label.slice(1)
    return `${name}: ${fieldValue(change.field, change.from)} to ${fieldValue(change.field, change.to)}`
  })
}

// The sentence for one log entry: before and after go around the task title, and more holds
// extra lines shown under it.
export function describeActivity(event) {
  const details = event.details ?? {}
  switch (event.type) {
    case 'PROJECT_CREATED':
      return { before: 'created the project', after: '', more: [] }
    case 'PROJECT_ARCHIVED':
      return { before: 'archived the project', after: '', more: [] }
    case 'PROJECT_RESTORED':
      return { before: 'restored the project', after: '', more: [] }
    case 'PROJECT_UPDATED':
      return { before: 'changed the project settings', after: '', more: changeLines(details.changes) }
    case 'TASK_CREATED':
      return {
        before: details.imported ? 'imported' : 'created',
        after: details.assignees?.length ? `and assigned ${list(details.assignees)}` : '',
        more: [],
      }
    case 'TASK_UPDATED':
      return { before: 'edited', after: '', more: changeLines(details.changes) }
    case 'TASK_MOVED':
      return { before: 'moved', after: `from ${statusLabel(details.from)} to ${statusLabel(details.to)}`, more: [] }
    case 'TASK_DELETED':
      return { before: 'deleted', after: details.status ? `from ${statusLabel(details.status)}` : '', more: [] }
    // US-20: phases belong to the project, so the sentence names the phase instead of a task.
    case 'PHASE_CREATED':
      return {
        before: `added the phase “${details.name}”`,
        after: '',
        more: details.startDate && details.endDate ? [`${formatDueDate(details.startDate)} to ${formatDueDate(details.endDate)}`] : [],
      }
    case 'PHASE_UPDATED':
      return { before: `edited the phase “${details.name}”`, after: '', more: changeLines(details.changes) }
    case 'PHASE_DELETED':
      return { before: `deleted the phase “${details.name}”`, after: '', more: ['Its tasks stay on the board without a phase.'] }
    case 'MEMBER_INVITED':
      return { before: `invited ${details.username}`, after: '', more: [] }
    case 'INVITATION_CANCELLED':
      return { before: `cancelled the invitation to ${details.username}`, after: '', more: [] }
    case 'INVITATION_DECLINED':
      return { before: 'declined the invitation', after: '', more: [] }
    case 'MEMBER_JOINED':
      return { before: 'joined the project', after: '', more: [] }
    case 'MEMBER_ACCESS_CHANGED':
      return {
        before: `changed ${details.username}’s access from ${taskAccessLabel(details.from)} to ${taskAccessLabel(details.to)}`,
        after: '',
        more: [],
      }
    case 'MEMBER_REMOVED':
      return { before: `removed ${details.username} from the project`, after: '', more: [] }
    case 'MEMBER_LEFT':
      return { before: 'left the project', after: '', more: [] }
    default:
      return { before: 'made a change', after: '', more: [] }
  }
}

// The same entry inside one task's details, where the task itself is "it" (Figma: Task details / Activity).
export function describeTaskActivity(event) {
  const details = event.details ?? {}
  switch (event.type) {
    case 'TASK_CREATED':
      return {
        text: `${details.imported ? 'imported' : 'created'} the task${details.assignees?.length ? ` and assigned ${list(details.assignees)}` : ''}`,
        more: [],
      }
    case 'TASK_MOVED':
      return { text: `moved it from ${statusLabel(details.from)} to ${statusLabel(details.to)}`, more: [] }
    case 'TASK_UPDATED': {
      const lines = changeLines(details.changes)
      return lines.length === 1 ? { text: lowerFirst(lines[0]), more: [] } : { text: 'edited the task', more: lines }
    }
    case 'TASK_DELETED':
      return { text: 'deleted the task', more: [] }
    default:
      return { text: describeActivity(event).before, more: [] }
  }
}

function lowerFirst(text) {
  // "Flagged as blocked" reads as "flagged as blocked"; field names keep a colon form.
  return text.charAt(0).toLowerCase() + text.slice(1)
}

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export function dayLabel(date, now = new Date()) {
  const start = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diff = Math.round((start(now) - start(date)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return dayFormat.format(date)
}

const clockFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

// "Today, 09:12", "Yesterday, 16:40" or "5 Oct" (Figma R46).
export function activityTime(value, now = new Date()) {
  const date = new Date(value)
  const label = dayLabel(date, now)
  if (label === 'Today' || label === 'Yesterday') return `${label}, ${clockFormat.format(date)}`
  // "28 Sep", matching due dates (en-GB writes September as "Sept").
  return formatShortDate(value)
}
