// Turns one project's tasks into the short summary the AI report is based on (TF-14, US-31).
// Pure function: no database, so it is easy to test. loadProjectData.js fetches the rows.

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE']
const DAY_MS = 24 * 60 * 60 * 1000
const LIST_LIMIT = 15 // keeps the request small (and cheap) for big projects

const dateOnly = (date) => new Date(date).toISOString().slice(0, 10)
const daysBetween = (from, to) => Math.floor((new Date(to) - new Date(from)) / DAY_MS)
const nameOf = (user) => user?.username ?? 'unnamed member'

// data: { project, members: [{ role, user }], tasks: [{ ..., assignees: [{ user }] }] }
export function summarizeProject({ project, members, tasks }, today = new Date()) {
  const todayText = dateOnly(today)
  const inAWeek = dateOnly(new Date(today.getTime() + 7 * DAY_MS))
  const open = tasks.filter((task) => task.status !== 'DONE')

  const tasksByStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]))
  for (const task of tasks) tasksByStatus[task.status] += 1

  const brief = (task) => ({
    title: task.title,
    status: task.status,
    priority: task.priority ?? null,
    dueDate: task.dueDate ? dateOnly(task.dueDate) : null,
    assignees: task.assignees.map((a) => nameOf(a.user)),
  })

  const isOverdue = (task) => task.dueDate && dateOnly(task.dueDate) < todayText
  const overdueTasks = open.filter(isOverdue)
  const dueThisWeek = open.filter(
    (task) => task.dueDate && !isOverdue(task) && dateOnly(task.dueDate) <= inAWeek,
  )
  const blockedTasks = open
    .filter((task) => task.isBlocked)
    .map((task) => ({
      ...brief(task),
      blockedReason: task.blockedReason ?? null,
      // Tasks have no "blocked since" date yet, so the last update is the closest estimate.
      daysSinceLastUpdate: daysBetween(task.updatedAt, today),
    }))

  const memberLoad = members.map((member) => {
    const mine = tasks.filter((task) => task.assignees.some((a) => a.user?.id === member.user.id))
    return {
      member: nameOf(member.user),
      role: member.role,
      openTasks: mine.filter((task) => task.status !== 'DONE').length,
      doneTasks: mine.filter((task) => task.status === 'DONE').length,
      overdueTasks: mine.filter((task) => task.status !== 'DONE' && isOverdue(task)).length,
    }
  })

  return {
    project: project.name,
    today: todayText,
    totalTasks: tasks.length,
    tasksByStatus,
    percentDone: tasks.length ? Math.round((tasksByStatus.DONE / tasks.length) * 100) : 0,
    overdueTasks: overdueTasks.slice(0, LIST_LIMIT).map(brief),
    dueThisWeek: dueThisWeek.slice(0, LIST_LIMIT).map(brief),
    blockedTasks: blockedTasks.slice(0, LIST_LIMIT),
    memberLoad,
  }
}
