import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Logo from '../../components/Logo.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import { BellIcon, ChatIcon, OverdueIcon, SparkleIcon, WarningIcon } from '../../components/icons.jsx'
import { animate } from '../../lib/motion.js'
import { useInView, useReducedMotion } from './hooks.js'

// A live, self-playing preview of the board for the hero. It is built from the app's own status
// icons, priority badges and colours, not a screenshot, and plays a short story: a task moves, a
// blocker is flagged, work is finished, the team talks in chat and a report sums it up.
// Everything inside the stage is decorative (aria-hidden); the figure caption tells the same story.

const TASKS = {
  slides: { title: 'Draft the launch slides', priority: 'MEDIUM', due: 'Due Thu', people: ['fahad'] },
  survey: { title: 'Write the survey questions', priority: 'LOW', due: 'Due Sun', people: ['lina'] },
  signin: { title: 'Wireframe the sign-in flow', priority: 'MEDIUM', overdue: 'Overdue · Mon', people: ['sara'] },
  lab: { title: 'Book the usability lab', priority: 'HIGH', due: 'Due tomorrow', people: ['omar'] },
  board: { title: 'Prototype the board', priority: 'MEDIUM', due: 'Due today', people: ['fahad', 'sara'] },
  repo: { title: 'Set up the repository', people: ['omar'] },
  tokens: { title: 'Agree the colour tokens', people: ['sara', 'lina'] },
}

const LANES = [
  { id: 'TODO', label: 'To Do', accent: 'bg-status-todo', wideOnly: true },
  { id: 'IN_PROGRESS', label: 'In Progress', accent: 'bg-status-in-progress' },
  { id: 'READY_FOR_REVIEW', label: 'Ready for Review', accent: 'bg-status-review' },
  { id: 'DONE', label: 'Done', accent: 'bg-status-done' },
]

const INITIAL = {
  TODO: ['slides', 'survey'],
  IN_PROGRESS: ['signin', 'lab'],
  READY_FOR_REVIEW: ['board'],
  DONE: ['repo', 'tokens'],
}

const TOTAL = Object.keys(TASKS).length

// Step 0 is the starting board. Each later step has a label for the controls under the preview.
const STEPS = [
  { key: 'start', hold: 1300 },
  { key: 'move', label: 'Move a task', kind: 'move', task: 'signin', to: 'READY_FOR_REVIEW', hold: 1500 },
  { key: 'flag', label: 'Flag a blocker', kind: 'click', task: 'lab', hold: 1700 },
  { key: 'finish', label: 'Finish the work', kind: 'move', task: 'board', to: 'DONE', hold: 1500 },
  { key: 'talk', label: 'Talk it through', kind: 'show', hold: 3200 },
  { key: 'report', label: 'Get a report', kind: 'show', hold: 4200 },
]
const LAST = STEPS.length - 1

// How long each step's own motion takes before it holds, so the progress fill matches the story.
const MOTION_MS = { move: 1950, click: 1150, show: 0 }

function stepDuration(step) {
  return (MOTION_MS[step.kind] ?? 0) + step.hold
}

function deriveBoard(applied) {
  const lanes = Object.fromEntries(Object.entries(INITIAL).map(([lane, ids]) => [lane, [...ids]]))
  const blocked = new Set()
  for (let index = 1; index <= applied; index += 1) {
    const step = STEPS[index]
    if (step.kind === 'move') {
      for (const lane of Object.keys(lanes)) lanes[lane] = lanes[lane].filter((id) => id !== step.task)
      lanes[step.to].unshift(step.task)
    }
    if (step.key === 'flag') blocked.add(step.task)
  }
  const attention = ['signin', ...blocked].filter((id) => !lanes.DONE.includes(id))
  return { lanes, blocked, done: lanes.DONE.length, attention: attention.length }
}

// Layout position inside the stage, ignoring transforms (so a card still gliding, or the stage's
// scale, never skews the measurement).
function localPosition(node, stage) {
  let x = 0
  let y = 0
  let current = node
  while (current && current !== stage) {
    x += current.offsetLeft
    y += current.offsetTop
    current = current.offsetParent
  }
  return { x, y, width: node.offsetWidth, height: node.offsetHeight }
}

// Points the cursor at the upper right part of a card, gliding there over `ms`.
function moveCursor(node, box, ms) {
  if (!node) return
  node.style.transitionDuration = `${ms}ms, 200ms`
  node.style.transform = `translate(${box.x + box.width * 0.62}px, ${box.y + 14}px)`
}

const WIDE = { width: 760, height: 432 }
const NARROW = { width: 520, height: 452 }

function MiniAvatar({ name }) {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-white bg-action text-[11px] font-medium text-white">
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function Card({ id, blocked, lifted, quiet }) {
  const task = TASKS[id]
  return (
    <div
      data-hero-task={id}
      data-lifted={lifted ? 'true' : 'false'}
      className="hero-card relative flex flex-col gap-1.5 rounded-[10px] border border-line bg-white px-2.5 pt-2 pb-2.5 shadow-card"
    >
      {blocked && <span className="hero-pop absolute inset-y-0 left-0 w-[3px] rounded-l-[10px] bg-blocked" />}
      <p className={`text-[12.5px] leading-[17px] font-medium ${quiet ? 'text-muted' : 'text-body'}`}>{task.title}</p>
      {task.overdue && (
        <span className="flex items-center gap-1 text-[11px] leading-4 text-blocked">
          <OverdueIcon />
          {task.overdue}
        </span>
      )}
      {!task.overdue && task.due && !quiet && <span className="text-[11px] leading-4 text-muted">{task.due}</span>}
      {blocked && (
        <span className="hero-pop inline-flex w-fit items-center gap-1 rounded-full bg-priority-high-bg px-2 py-0.5 text-[11px] font-medium text-priority-high-text">
          <StatusIcon status="BLOCKED" />
          Blocked
        </span>
      )}
      <div className="flex items-center justify-between gap-1">
        {task.priority && !quiet ? <PriorityBadge priority={task.priority} /> : <span />}
        <span className="flex -space-x-1.5">
          {task.people.map((name) => (
            <MiniAvatar key={name} name={name} />
          ))}
        </span>
      </div>
    </div>
  )
}

// The cursor's position is written straight to its style (moveCursor), so following a card costs no render.
function Cursor({ cursor, cursorRef }) {
  return (
    <div
      ref={cursorRef}
      className="hero-cursor pointer-events-none absolute top-0 left-0 z-30"
      style={{ transform: 'translate(520px, 380px)', opacity: cursor.visible ? 1 : 0, transitionDuration: '700ms, 200ms' }}
    >
      {cursor.pressed && <span className="hero-pop absolute -top-2.5 -left-2.5 size-6 rounded-full bg-action/20" />}
      <svg
        className="hero-cursor-press relative drop-shadow-[0_2px_3px_rgba(20,31,23,0.25)]"
        style={{ transform: cursor.pressed ? 'scale(0.86)' : 'none' }}
        width="20"
        height="22"
        viewBox="0 0 20 22"
        fill="none"
      >
        <path d="M2 1.5v16.8l4.5-4.2 3 6.4 3.1-1.4-3-6.3h6.3L2 1.5Z" fill="#263629" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function ChatPanel({ open, narrow }) {
  return (
    <div
      data-open={open ? 'true' : 'false'}
      className={`hero-panel absolute top-[48px] right-0 bottom-0 z-10 flex flex-col border-l border-line bg-white ${narrow ? 'w-[200px]' : 'w-[220px]'}`}
    >
      <div className="flex h-11 items-center gap-2 border-b border-line px-3.5 text-[13px] font-semibold text-heading">
        <ChatIcon />
        Project chat
      </div>
      {open && (
        <div className="flex flex-1 flex-col justify-end gap-3 p-3.5">
          <div className="hero-pop flex gap-2">
            <MiniAvatar name="omar" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted">
                <span className="font-semibold text-heading">omar</span> · 10:42
              </p>
              <p className="mt-0.5 text-[12px] leading-[17px] text-body">The lab is still waiting on room approval.</p>
              <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-heading">
                <StatusIcon status="BLOCKED" />
                <span className="truncate">Book the usability lab</span>
              </span>
            </div>
          </div>
          <div className="hero-pop flex gap-2 [animation-delay:900ms]">
            <MiniAvatar name="lina" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted">
                <span className="font-semibold text-heading">lina</span> · 10:44
              </p>
              <p className="mt-0.5 text-[12px] leading-[17px] text-body">I can ask the office this afternoon.</p>
            </div>
          </div>
          <div className="mt-1 flex h-9 items-center rounded-[9px] border border-line px-2.5 text-[12px] text-muted">
            Message the team
          </div>
        </div>
      )}
    </div>
  )
}

function ReportCard({ narrow }) {
  return (
    <div
      className={`hero-pop absolute bottom-3.5 left-3.5 z-20 rounded-[14px] border border-[#ecd3c8] bg-white p-3.5 shadow-[0_18px_40px_rgba(20,31,23,0.16)] ${narrow ? 'w-[268px]' : 'w-[300px]'}`}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-[#f8e6de] text-attention">
          <SparkleIcon />
        </span>
        <p className="text-[13px] font-semibold text-heading">Project report</p>
        <span className="ml-auto text-[11px] text-muted">Just now</span>
      </div>
      <p className="mt-2.5 text-[12px] leading-[17px] text-body">3 of 7 tasks are done. The board prototype moved to Done today.</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-[12px] leading-[17px]">
        <li className="flex items-start gap-1.5 text-priority-high-text">
          <span className="mt-0.5 shrink-0 text-attention">
            <WarningIcon />
          </span>
          The lab booking is blocked and holds up the demo.
        </li>
        <li className="flex items-start gap-1.5 text-body">
          <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-action" />
          omar has the most open tasks on the team.
        </li>
      </ul>
      <p className="mt-3 border-t border-line pt-2 text-[11px] font-medium text-action">Advice only. Nothing in the project was changed.</p>
    </div>
  )
}

export default function HeroPreview() {
  const reduce = useReducedMotion()
  const wrapperRef = useRef(null)
  const stageRef = useRef(null)
  const inView = useInView(wrapperRef, { threshold: 0.25 })
  const [pageVisible, setPageVisible] = useState(true)
  const [size, setSize] = useState({ narrow: false, scale: 1 })
  // `step` is the story step shown in the controls; `applied` is how far the board itself has got.
  const [step, setStep] = useState(() => (reduce ? LAST : 0))
  const [applied, setApplied] = useState(() => (reduce ? LAST : 0))
  const [playing, setPlaying] = useState(() => !reduce)
  const [lifted, setLifted] = useState(null)
  const [fading, setFading] = useState(false)
  const [cursor, setCursor] = useState({ visible: false, pressed: false })
  const cursorRef = useRef(null)
  const appliedRef = useRef(applied)
  const positionsRef = useRef(new Map())
  const skipGlideRef = useRef(false)
  const narrowRef = useRef(size.narrow)

  const design = size.narrow ? NARROW : WIDE
  const board = deriveBoard(applied)
  const lanes = LANES.filter((lane) => !(size.narrow && lane.wideOnly))

  // The stage is drawn at a fixed design size and scaled to fit; phones get a three-lane version.
  useLayoutEffect(() => {
    const node = wrapperRef.current
    if (!node) return undefined
    function measure() {
      const width = node.clientWidth
      const narrow = width < 600
      const designWidth = narrow ? NARROW.width : WIDE.width
      setSize({ narrow, scale: Math.min(1, width / designWidth) })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function onVisibility() {
      setPageVisible(document.visibilityState !== 'hidden')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Cards glide from where they were to where they are now (FLIP), and a carried card brings the cursor along.
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const next = new Map()
    for (const node of stage.querySelectorAll('[data-hero-task]')) next.set(node.dataset.heroTask, localPosition(node, stage))
    const previous = positionsRef.current
    // Switching between the phone and wide layouts redraws the board; nothing should glide then.
    if (narrowRef.current !== size.narrow) {
      narrowRef.current = size.narrow
      skipGlideRef.current = true
    }
    if (!skipGlideRef.current) {
      for (const node of stage.querySelectorAll('[data-hero-task]')) {
        const before = previous.get(node.dataset.heroTask)
        const now = next.get(node.dataset.heroTask)
        if (!before) continue
        const dx = before.x - now.x
        const dy = before.y - now.y
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
        const lift = node.dataset.lifted === 'true' ? ' scale(1.03)' : ''
        animate(node, [{ transform: `translate(${dx}px, ${dy}px)${lift}` }, { transform: `translate(0, 0)${lift}` }], { duration: 560 })
      }
    }
    skipGlideRef.current = false
    positionsRef.current = next
    appliedRef.current = applied
    const carried = lifted && next.get(lifted)
    if (carried) moveCursor(cursorRef.current, carried, 560)
  }, [applied, lifted, size.narrow])

  // A lifted card keeps a slight scale while it is held.
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    for (const node of stage.querySelectorAll('[data-hero-task]')) {
      node.style.transform = node.dataset.heroTask === lifted ? 'scale(1.03)' : ''
    }
  }, [lifted, applied])

  // The story itself: each step points the cursor, acts, holds, then moves on. It pauses off screen,
  // in a hidden tab and when paused, and starts over with a short fade after the last step.
  useEffect(() => {
    if (!playing || !inView || !pageVisible) return undefined
    const timers = []
    const at = (ms, work) => timers.push(setTimeout(work, ms))
    const current = STEPS[step]
    const stage = stageRef.current
    let elapsed = 0

    function pointAt(id) {
      const node = stage?.querySelector(`[data-hero-task="${id}"]`)
      if (!node) return
      moveCursor(cursorRef.current, localPosition(node, stage), 720)
      setCursor((value) => ({ ...value, visible: true }))
    }

    if (appliedRef.current < step) {
      if (reduce || !current.task) {
        at(0, () => setApplied(step))
      } else if (current.kind === 'move') {
        at(0, () => pointAt(current.task))
        at(760, () => {
          setCursor((value) => ({ ...value, pressed: true }))
          setLifted(current.task)
        })
        at(1000, () => setApplied(step))
        at(1640, () => {
          setLifted(null)
          setCursor((value) => ({ ...value, pressed: false }))
        })
        at(1950, () => setCursor((value) => ({ ...value, visible: false })))
        elapsed = MOTION_MS.move
      } else {
        at(0, () => pointAt(current.task))
        at(760, () => setCursor((value) => ({ ...value, pressed: true })))
        at(940, () => {
          setCursor((value) => ({ ...value, pressed: false }))
          setApplied(step)
        })
        at(1150, () => setCursor((value) => ({ ...value, visible: false })))
        elapsed = MOTION_MS.click
      }
    }

    at(elapsed + current.hold, () => {
      if (step < LAST) {
        setStep(step + 1)
        return
      }
      setFading(true)
      at(360, () => {
        skipGlideRef.current = true
        setApplied(0)
        setStep(0)
        setFading(false)
      })
    })

    return () => {
      timers.forEach(clearTimeout)
      setLifted(null)
      setCursor((value) => ({ ...value, visible: false, pressed: false }))
    }
  }, [step, playing, inView, pageVisible, reduce])

  // Choosing a step shows the board as it is at the end of that step.
  function jumpTo(index) {
    skipGlideRef.current = Math.abs(index - appliedRef.current) > 1 || reduce
    setFading(false)
    setLifted(null)
    setApplied(index)
    setStep(index)
  }

  return (
    <figure aria-labelledby="hero-preview-caption" className="relative mx-auto w-full max-w-[880px]">
      <div ref={wrapperRef} className="relative w-full" style={{ height: design.height * size.scale }}>
        <div
          ref={stageRef}
          aria-hidden="true"
          className={`hero-stage hero-fade absolute top-0 left-1/2 overflow-hidden rounded-[18px] text-left border border-[#dbe3d9] bg-white shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_30px_60px_-20px_rgba(20,40,25,0.25),0_12px_24px_-12px_rgba(20,40,25,0.12)] ${fading ? 'opacity-0' : 'opacity-100'}`}
          style={{
            width: design.width,
            height: design.height,
            transform: `translateX(-50%) scale(${size.scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Window bar: project, page tabs, progress and Needs attention. */}
          <div className="flex h-12 items-center gap-3 border-b border-line px-3.5">
            <Logo label="" size={22} />
            <span className="text-[13px] font-semibold text-heading">Final project</span>
            {!size.narrow && (
              <span className="flex items-center gap-1 text-[12px]">
                <span className="rounded-md px-2 py-1 text-muted">Overview</span>
                <span className="rounded-md bg-nav-active px-2 py-1 font-medium text-heading">Board</span>
                <span className="rounded-md px-2 py-1 text-muted">Reports</span>
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <span className="inline-flex h-7 items-center gap-2 rounded-full border border-line px-2.5 text-[11px] font-medium text-heading">
                <span key={board.done} className="hero-tick tabular-nums">
                  {board.done} of {TOTAL} done
                </span>
                <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-surface-subtle">
                  <span
                    className="absolute inset-0 origin-left rounded-full bg-status-done transition-transform duration-500"
                    style={{ transform: `scaleX(${board.done / TOTAL})` }}
                  />
                </span>
              </span>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-priority-high-bg px-2.5 text-[11px] font-medium text-priority-high-text">
                <WarningIcon />
                <span key={board.attention} className="hero-tick tabular-nums">
                  {size.narrow ? board.attention : `Needs attention · ${board.attention}`}
                </span>
              </span>
              {!size.narrow && (
                <span className="relative inline-flex size-7 items-center justify-center rounded-lg border border-line text-heading">
                  <BellIcon />
                  <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-white bg-attention" />
                </span>
              )}
            </span>
          </div>

          <div className="flex gap-2.5 p-3.5" style={{ height: design.height - 48 }}>
            {lanes.map((lane) => (
              <div key={lane.id} className="relative flex min-w-0 flex-1 flex-col gap-2 rounded-[12px] border border-line bg-surface p-2">
                <span className="pointer-events-none absolute -inset-px overflow-hidden rounded-[12px]">
                  <span className={`absolute inset-x-0 top-0 h-1 ${lane.accent}`} />
                </span>
                <p className="mt-0.5 flex items-center gap-1.5 px-0.5 text-[12px] text-body">
                  <StatusIcon status={lane.id} />
                  <span>
                    {lane.label} · <span className="tabular-nums">{board.lanes[lane.id].length}</span>
                  </span>
                </p>
                {board.lanes[lane.id].map((id) => (
                  <Card key={id} id={id} blocked={board.blocked.has(id)} lifted={lifted === id} quiet={lane.id === 'DONE'} />
                ))}
              </div>
            ))}
          </div>

          <ChatPanel open={applied >= 4} narrow={size.narrow} />
          {applied >= 5 && <ReportCard narrow={size.narrow} />}
          {!reduce && <Cursor cursor={cursor} cursorRef={cursorRef} />}
        </div>
      </div>

      <figcaption id="hero-preview-caption" className="sr-only">
        A preview of a Khatet board. A task moves to Ready for Review, a blocked task is flagged, finished work
        moves to Done, the team talks about it in project chat, and a report sums up progress without
        changing anything.
      </figcaption>

      <div className="mt-6 flex items-center gap-3 sm:flex-wrap sm:justify-center sm:gap-2">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? 'Pause the preview' : 'Play the preview'}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-heading hover:bg-surface sm:size-9"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="3" y="2" width="3" height="10" rx="1" fill="currentColor" />
              <rect x="8" y="2" width="3" height="10" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M4 2.5v9a.5.5 0 0 0 .77.42l7-4.5a.5.5 0 0 0 0-.84l-7-4.5A.5.5 0 0 0 4 2.5Z" fill="currentColor" />
            </svg>
          )}
        </button>
        {/* Phones show a slim story bar with the step name under it; wider screens show labelled pills. */}
        <ol aria-label="Preview steps" className="flex flex-1 gap-1.5 sm:flex-none sm:flex-wrap sm:justify-center sm:gap-2">
          {STEPS.slice(1).map((item, offset) => {
            const index = offset + 1
            const state = index < step ? 'done' : index === step ? (playing ? 'active' : 'done') : 'todo'
            return (
              <li key={item.key} className="flex-1 sm:flex-none">
                <button
                  type="button"
                  onClick={() => jumpTo(index)}
                  aria-current={index === step ? 'step' : undefined}
                  className={`relative flex h-11 w-full items-center text-label font-medium transition-colors duration-150 sm:inline-flex sm:h-9 sm:w-auto sm:overflow-hidden sm:rounded-full sm:border sm:px-3.5 ${
                    index === step ? 'text-heading sm:border-action' : 'text-muted hover:text-heading sm:border-line sm:bg-white'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-line sm:inset-0 sm:h-auto sm:translate-y-0 sm:rounded-none sm:bg-transparent"
                  >
                    <span
                      key={`${index}-${step}-${playing}`}
                      data-state={state}
                      data-paused={!inView || !pageVisible ? 'true' : 'false'}
                      className="hero-step-fill absolute inset-0 bg-action sm:bg-nav-active"
                      style={{ animationDuration: `${stepDuration(item)}ms` }}
                    />
                  </span>
                  <span className="sr-only sm:not-sr-only sm:relative">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
      <p aria-hidden="true" className="mt-1 text-center text-label font-medium text-muted sm:hidden">
        {step > 0 ? `${step} of ${STEPS.length - 1}: ${STEPS[step].label}` : STEPS[1].label}
      </p>
    </figure>
  )
}
