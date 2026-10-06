// Enum values from docs/data-model.md with the labels the interface shows.

export const STATUSES = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'READY_FOR_REVIEW', label: 'Ready for Review' },
  { value: 'DONE', label: 'Done' },
]

export const ACTIVE_STATUSES = STATUSES.filter((status) => status.value !== 'BACKLOG')

export function statusLabel(value) {
  return STATUSES.find((status) => status.value === value)?.label ?? value
}

export const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

export function priorityLabel(value) {
  return PRIORITIES.find((priority) => priority.value === value)?.label ?? 'None'
}

export const TASK_ACCESS = [
  { value: 'VIEW_ONLY', label: 'View tasks only', help: 'Can read tasks but not change them.' },
  { value: 'EDIT_ASSIGNED', label: 'Edit assigned tasks', help: 'Can edit and move the tasks assigned to them.' },
  { value: 'EDIT_ALL', label: 'Edit all tasks', help: 'Can create, edit, move and delete any task.' },
]

export function taskAccessLabel(value) {
  return TASK_ACCESS.find((access) => access.value === value)?.label ?? value
}

export function roleLabel(role) {
  return role === 'OWNER' ? 'Owner' : 'Member'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Due dates are calendar dates (YYYY-MM-DD), so they are read as plain parts to avoid a day shift.
// Months are spelled as in Figma ("20 Sep"); Intl's en-GB gives "Sept".
export function formatDueDate(value, { short = false } = {}) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  const date = `${day} ${MONTHS[month - 1]}`
  return short ? date : `${date} ${year}`
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function formatTimestamp(value) {
  return value ? timeFormat.format(new Date(value)) : ''
}

function dayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// Notification times as in Figma: "2m", "5m", "1h" in the desktop list, and
// "08:15", "Yesterday" or "3 Oct" on the mobile page.
export function notificationTime(value, now = new Date()) {
  const date = new Date(value)
  const minutes = Math.max(0, Math.floor((now - date) / 60_000))
  const days = Math.round((dayStart(now) - dayStart(date)) / 86_400_000)
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const dayLabel = days === 0 ? clock : days === 1 ? 'Yesterday' : `${date.getDate()} ${MONTHS[date.getMonth()]}`
  let short
  if (minutes < 1) short = 'now'
  else if (minutes < 60) short = `${minutes}m`
  else if (minutes < 24 * 60) short = `${Math.floor(minutes / 60)}h`
  else short = days === 1 ? '1d' : `${date.getDate()} ${MONTHS[date.getMonth()]}`
  return { short, long: dayLabel }
}

function todayKey(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// The due line on a board card: "Due 20 Sep", "Due today" or "No due date".
// A past due date on an unfinished task reads "Overdue · 20 Sep", so it is not shown by colour alone.
export function dueLine(dueDate, status, now = new Date()) {
  if (!dueDate) return { text: 'No due date', overdue: false }
  const today = todayKey(now)
  if (dueDate === today) return { text: 'Due today', overdue: false }
  const overdue = dueDate < today && status !== 'DONE'
  const date = formatDueDate(dueDate, { short: true })
  return { text: overdue ? `Overdue · ${date}` : `Due ${date}`, overdue }
}
