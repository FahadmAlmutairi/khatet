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

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const shortDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

// Due dates are calendar dates (YYYY-MM-DD), so they are read as UTC to avoid a day shift.
export function formatDueDate(value, { short = false } = {}) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00Z`)
  return (short ? shortDateFormat : dateFormat).format(date)
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function formatTimestamp(value) {
  return value ? timeFormat.format(new Date(value)) : ''
}
