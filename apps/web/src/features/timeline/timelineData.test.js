import { describe, expect, it } from 'vitest'
import { buildTimeline, currentPhase, formatRange, isOverdue, timelineList } from './timelineData.js'

// Noon in Riyadh on Monday 23 November 2026.
const now = new Date('2026-11-23T09:00:00Z')

const phases = [
  { id: 'ph-2', name: 'Build', startDate: '2026-10-01', endDate: '2026-11-21' },
  { id: 'ph-1', name: 'Discovery', startDate: '2026-09-01', endDate: '2026-09-30' },
  { id: 'ph-3', name: 'Release', startDate: '2026-11-22', endDate: '2026-12-05' },
]

function task(id, title, dueDate, extra = {}) {
  return { id, title, dueDate, status: 'TODO', phaseId: null, isBlocked: false, ...extra }
}

const tasks = [
  task('a', 'Write tests', '2026-10-20', { phaseId: 'ph-2' }),
  task('b', 'Agree the scope', '2026-09-10', { phaseId: 'ph-1', status: 'DONE' }),
  task('c', 'Fix the header', '2026-10-05', { phaseId: 'ph-2' }),
  task('d', 'Book the demo room', '2026-12-01'),
  task('e', 'Undated idea', null),
  task('f', 'Task of a deleted phase', '2026-11-30', { phaseId: 'ph-gone' }),
]

describe('buildTimeline (US-29)', () => {
  const timeline = buildTimeline({ phases, tasks, now })

  it('orders phases by start date with their dated tasks by due date, then "No phase"', () => {
    expect(timeline.groups.map((group) => group.phase?.name ?? 'No phase')).toEqual(['Discovery', 'Build', 'Release', 'No phase'])
    expect(timeline.groups[1].tasks.map((item) => item.id)).toEqual(['c', 'a'])
    expect(timeline.groups[2].tasks).toEqual([])
    // A task whose phase was deleted is not lost.
    expect(timeline.groups[3].tasks.map((item) => item.id)).toEqual(['f', 'd'])
  })

  it('leaves tasks without a due date out and counts them', () => {
    const shown = timeline.groups.flatMap((group) => group.tasks.map((item) => item.id))
    expect(shown).not.toContain('e')
    expect(timeline.undatedCount).toBe(1)
    expect(timeline.datedCount).toBe(5)
  })

  it('covers whole months from the first phase to the last date, today included', () => {
    expect(timeline.today).toBe('2026-11-23')
    expect(timeline.months.map((month) => month.label)).toEqual(['Sep', 'Oct', 'Nov', 'Dec'])
    expect(timeline.months[0].year).toBe(2026)
    expect(timeline.months[1].year).toBeNull()
    const total = timeline.months.reduce((sum, month) => sum + month.width, 0)
    expect(total).toBeCloseTo(100)
    expect(timeline.position('2026-09-01')).toBe(0)
    expect(timeline.position('2026-12-31') + timeline.span('2026-12-31', '2026-12-31')).toBeCloseTo(100)
  })

  it('reaches today even when everything is in the past', () => {
    const past = buildTimeline({ tasks: [task('x', 'Old', '2026-03-02')], now })
    expect(past.months[0].key).toBe('2026-03')
    expect(past.months.at(-1).key).toBe('2026-11')
    expect(past.isEmpty).toBe(false)
  })

  it('is empty with no phases and no dated tasks', () => {
    const empty = buildTimeline({ tasks: [task('e', 'Undated', null)], now })
    expect(empty.isEmpty).toBe(true)
    expect(empty.undatedCount).toBe(1)
  })

  it('marks open tasks past their due date as overdue, never Done ones', () => {
    expect(isOverdue(tasks[2], '2026-11-23')).toBe(true)
    expect(isOverdue(tasks[1], '2026-11-23')).toBe(false)
    expect(isOverdue(tasks[3], '2026-11-23')).toBe(false)
  })
})

describe('timelineList (US-29 list view)', () => {
  it('puts phases and tasks in one date order with today in its place, grouped by month', () => {
    const months = timelineList({ phases, tasks, now })
    expect(months.map((month) => month.heading)).toEqual(['September 2026', 'October 2026', 'November 2026', 'December 2026'])
    const november = months[2].items.map((item) => item.phase?.name ?? item.task?.title ?? item.kind)
    expect(november).toEqual(['Release', 'today', 'Task of a deleted phase'])
    expect(months.flatMap((month) => month.items).some((item) => item.task?.id === 'e')).toBe(false)
  })

  it('keeps items due today above the today line and lists a phase before tasks on its start day', () => {
    const sameDay = [task('t', 'Kick-off notes', '2026-11-22'), task('u', 'Due today', '2026-11-23')]
    const items = timelineList({ phases, tasks: sameDay, now }).find((month) => month.key === '2026-11').items
    expect(items.map((item) => item.phase?.name ?? item.task?.title ?? item.kind)).toEqual(['Release', 'Kick-off notes', 'Due today', 'today'])
  })

  it('names the phase of each task', () => {
    const items = timelineList({ phases, tasks, now }).flatMap((month) => month.items)
    expect(items.find((item) => item.task?.id === 'a').phaseName).toBe('Build')
    expect(items.find((item) => item.task?.id === 'd').phaseName).toBeNull()
  })
})

describe('currentPhase and formatRange', () => {
  it('finds the phase running today, or else the next one', () => {
    expect(currentPhase(phases, now)).toMatchObject({ phase: { name: 'Release' }, state: 'now' })
    expect(currentPhase(phases, new Date('2026-08-20T09:00:00Z'))).toMatchObject({ phase: { name: 'Discovery' }, state: 'next' })
    expect(currentPhase(phases, new Date('2027-01-10T09:00:00Z'))).toBeNull()
  })

  it('writes the year once, or twice across a year end', () => {
    expect(formatRange('2026-10-01', '2026-11-21')).toBe('1 Oct to 21 Nov 2026')
    expect(formatRange('2026-12-20', '2027-01-05')).toBe('20 Dec 2026 to 5 Jan 2027')
  })
})
