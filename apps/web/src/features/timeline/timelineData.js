import { dateFromToday } from '../../lib/domain.js'

// US-29: turns the project's phases and the board's tasks into what the Timeline draws.
// Dates are calendar days (YYYY-MM-DD), compared as whole days so nothing shifts by a time zone.

const DAY_MS = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function dayNumber(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

function keyFromDayNumber(number) {
  return new Date(number * DAY_MS).toISOString().slice(0, 10)
}

function monthStart(dateKey) {
  return `${dateKey.slice(0, 7)}-01`
}

function monthEnd(dateKey) {
  const [year, month] = dateKey.split('-').map(Number)
  return keyFromDayNumber(Date.UTC(year, month, 1) / DAY_MS - 1)
}

export function monthHeading(dateKey) {
  const [year, month] = dateKey.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

// "1 Oct to 21 Nov 2026", or "1 Oct 2026 to 5 Jan 2027" across a year end.
export function formatRange(startDate, endDate) {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
  const start = `${startDay} ${MONTHS[startMonth - 1]}${startYear === endYear ? '' : ` ${startYear}`}`
  return `${start} to ${endDay} ${MONTHS[endMonth - 1]} ${endYear}`
}

export function isOverdue(task, today) {
  return Boolean(task.dueDate) && task.dueDate < today && task.status !== 'DONE'
}

function byDueDate(a, b) {
  return a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title)
}

// Groups of { phase, tasks }: phases in date order, each with its dated tasks, then "No phase"
// for dated tasks without one (or whose phase was deleted). Tasks without a due date are left out
// of the timeline (US-29 AC2) and only counted, so the page can say how many are hidden.
export function buildTimeline({ phases = [], tasks = [], now = new Date() }) {
  const today = dateFromToday(0, now)
  const orderedPhases = [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name))
  const phaseIds = new Set(orderedPhases.map((phase) => phase.id))
  const dated = tasks.filter((task) => task.dueDate)
  const undatedCount = tasks.length - dated.length

  const groups = orderedPhases.map((phase) => ({
    phase,
    tasks: dated.filter((task) => task.phaseId === phase.id).sort(byDueDate),
  }))
  const loose = dated.filter((task) => !task.phaseId || !phaseIds.has(task.phaseId)).sort(byDueDate)
  if (loose.length) groups.push({ phase: null, tasks: loose })

  // The range covers every phase, every dated task and today, widened to whole months.
  const keys = [today, ...orderedPhases.flatMap((phase) => [phase.startDate, phase.endDate]), ...dated.map((task) => task.dueDate)]
  const first = keys.reduce((min, key) => (key < min ? key : min))
  const last = keys.reduce((max, key) => (key > max ? key : max))
  const start = monthStart(first)
  const end = monthEnd(last)
  const startDay = dayNumber(start)
  const totalDays = dayNumber(end) - startDay + 1

  const months = []
  for (let key = start; key <= end; key = keyFromDayNumber(dayNumber(monthEnd(key)) + 1)) {
    const [year, month] = key.split('-').map(Number)
    const from = dayNumber(key) - startDay
    const days = dayNumber(monthEnd(key)) - dayNumber(key) + 1
    months.push({
      key: key.slice(0, 7),
      label: MONTHS[month - 1],
      year: month === 1 || months.length === 0 ? year : null,
      left: (from / totalDays) * 100,
      width: (days / totalDays) * 100,
    })
  }

  return {
    today,
    groups,
    undatedCount,
    datedCount: dated.length,
    months,
    isEmpty: orderedPhases.length === 0 && dated.length === 0,
    // Left edge of a day as a percentage of the track; `middle` puts a marker in the day's centre.
    position: (dateKey, { middle = false } = {}) => ((dayNumber(dateKey) - startDay + (middle ? 0.5 : 0)) / totalDays) * 100,
    span: (startDate, endDate) => ((dayNumber(endDate) - dayNumber(startDate) + 1) / totalDays) * 100,
  }
}

// The list view: phases (on their start date) and dated tasks in one date order, with today's
// place marked, grouped by month. A phase comes before tasks due the same day.
export function timelineList({ phases = [], tasks = [], now = new Date() }) {
  const today = dateFromToday(0, now)
  const phaseNames = new Map(phases.map((phase) => [phase.id, phase.name]))
  const items = [
    ...phases.map((phase) => ({ kind: 'phase', id: phase.id, date: phase.startDate, phase })),
    ...tasks
      .filter((task) => task.dueDate)
      .map((task) => ({ kind: 'task', id: task.id, date: task.dueDate, task, phaseName: phaseNames.get(task.phaseId) ?? null })),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.kind === b.kind ? 0 : a.kind === 'phase' ? -1 : 1) ||
      (a.phase?.name ?? a.task.title).localeCompare(b.phase?.name ?? b.task.title),
  )

  // Today goes before the first item dated after it, so items due today stay above the line.
  const withToday = []
  let placed = false
  for (const item of items) {
    if (!placed && item.date > today) {
      withToday.push({ kind: 'today', id: 'today', date: today })
      placed = true
    }
    withToday.push(item)
  }
  if (!placed) withToday.push({ kind: 'today', id: 'today', date: today })

  const months = []
  for (const item of withToday) {
    const key = item.date.slice(0, 7)
    if (months.at(-1)?.key !== key) months.push({ key, heading: monthHeading(item.date), items: [] })
    months.at(-1).items.push(item)
  }
  return months
}

// For the Overview: the phase running today, or else the next one to start.
export function currentPhase(phases = [], now = new Date()) {
  const today = dateFromToday(0, now)
  const ordered = [...phases].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const running = ordered.find((phase) => phase.startDate <= today && phase.endDate >= today)
  if (running) return { phase: running, state: 'now' }
  const next = ordered.find((phase) => phase.startDate > today)
  return next ? { phase: next, state: 'next' } : null
}
