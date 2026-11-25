import { useEffect, useRef, useState } from 'react'
import { AvatarStack } from '../../components/Avatar.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import { useInView, useReducedMotion } from './hooks.js'

// Before and after: the questions a team asks in a group chat, and the same work as tasks on
// a board with an owner, a status and a due date. It sorts itself once when it scrolls into view.

const PAIRS = [
  {
    from: 'sara',
    message: 'who is doing the slides??',
    task: 'Draft the demo day slides',
    people: ['fahad'],
    status: 'TODO',
    meta: 'Due Thursday',
  },
  {
    from: 'omar',
    message: 'I thought lina had the survey',
    task: 'Write the survey questions',
    people: ['lina'],
    status: 'IN_PROGRESS',
    meta: 'Due Sunday',
  },
  {
    from: 'lina',
    message: 'yes, on it. is the lab booked yet?',
    task: 'Book the usability lab',
    people: ['omar'],
    status: 'IN_PROGRESS',
    blocked: 'Waiting for room approval',
  },
  {
    from: 'fahad',
    message: 'wait, is the deadline this Thursday or next?',
    task: 'Confirm the submission date',
    people: ['sara'],
    status: 'DONE',
    meta: 'Done yesterday',
  },
]

export default function ChatToPlan() {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { threshold: 0.45 })
  const [sorted, setSorted] = useState(reduce)
  const [played, setPlayed] = useState(reduce)

  // Sort once, a moment after the section comes into view.
  useEffect(() => {
    if (!inView || played) return undefined
    const timer = setTimeout(() => {
      setSorted(true)
      setPlayed(true)
    }, 700)
    return () => clearTimeout(timer)
  }, [inView, played])

  return (
    <div ref={ref} className="chat-plan grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6" data-sorted={sorted ? 'true' : 'false'}>
      <div className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
        <p className="flex items-center justify-between text-xs font-semibold tracking-[0.08em] text-muted uppercase">
          Group chat
          <span className="rounded-full bg-surface px-2 py-0.5 font-medium tracking-normal normal-case">143 unread</span>
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {PAIRS.map((pair, index) => (
            <li key={pair.task} className="chat-bubble flex items-end gap-2" style={{ '--delay': `${index * 90}ms` }}>
              <span
                aria-hidden="true"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-[11px] font-semibold text-heading"
              >
                {pair.from.slice(0, 2).toUpperCase()}
              </span>
              <p className="rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-sm text-body">
                <span className="block text-xs font-semibold text-heading">{pair.from}</span>
                {pair.message}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center lg:flex-col">
        <button
          type="button"
          onClick={() => {
            setPlayed(true)
            setSorted((value) => !value)
          }}
          aria-pressed={sorted}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-label font-medium text-heading shadow-card hover:bg-surface"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="max-lg:rotate-90">
            <path d="M3 8h10m0 0-3.5-3.5M13 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {sorted ? 'Show the chat again' : 'Turn it into a plan'}
        </button>
      </div>

      <div className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
        <p className="flex items-center justify-between text-xs font-semibold tracking-[0.08em] text-muted uppercase">
          Khatet board
          <span className="rounded-full bg-nav-active px-2 py-0.5 font-medium tracking-normal text-heading normal-case">4 tasks</span>
        </p>
        <ul className="mt-4 flex flex-col gap-2.5" aria-label="The same work as tasks">
          {PAIRS.map((pair, index) => (
            <li
              key={pair.task}
              className={`plan-card relative flex flex-col gap-2 rounded-[12px] border border-line bg-white p-3 shadow-card ${pair.blocked ? 'overflow-hidden' : ''}`}
              style={{ '--delay': `${200 + index * 110}ms` }}
            >
              {pair.blocked && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-blocked" />}
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-body">{pair.task}</p>
                <AvatarStack users={pair.people.map((name) => ({ id: name, username: name }))} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={pair.status} />
                {pair.blocked ? (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-priority-high-bg px-2.5 text-xs font-medium text-priority-high-text">
                    <StatusIcon status="BLOCKED" />
                    Blocked: {pair.blocked}
                  </span>
                ) : (
                  <span className="text-xs text-muted">{pair.meta}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
