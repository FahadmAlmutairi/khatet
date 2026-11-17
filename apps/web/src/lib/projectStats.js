import { dueLine } from './domain.js'

// Counts the overview and the AI report snapshot show, from the board's task list.
// Backlog tasks are kept apart from active work, so they are left out of the progress.
export function projectStats(tasks = [], now = new Date()) {
  const byStatus = { BACKLOG: 0, TODO: 0, IN_PROGRESS: 0, READY_FOR_REVIEW: 0, DONE: 0 }
  for (const task of tasks) byStatus[task.status] += 1
  const active = tasks.filter((task) => task.status !== 'BACKLOG')
  const blocked = tasks.filter((task) => task.isBlocked)
  const overdue = active.filter((task) => dueLine(task.dueDate, task.status, now)?.overdue)
  const total = active.length
  return {
    byStatus,
    total,
    done: byStatus.DONE,
    percent: total ? Math.round((byStatus.DONE / total) * 100) : 0,
    blocked,
    overdue,
  }
}
