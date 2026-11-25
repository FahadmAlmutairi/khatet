import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { useTasks } from '../../api/hooks.js'
import { CloseIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import { reducedMotion } from '../../lib/motion.js'
import { DEMO_PROJECT_ID, setTourStep, useLeaveDemo, useTourStep } from './demo.js'
import './tour.css'

// The guided tour of the live demo. Each step opens a real page of the sample project, lights up one
// part of it and explains it in a small card. It is not modal: the page stays usable, so a visitor can
// try what the step describes (for example moving a card) and then press Next.
//
// Accessibility: the card is a labelled dialog that takes focus when a step opens, Escape closes it,
// Back and Next are real buttons, nothing advances on a timer, and the step that teaches moving a card
// names the keyboard path (More actions, then Move to) alongside dragging.

const TOUR_STEPS = [
  {
    path: 'overview',
    target: '[data-tour="needs-attention"]',
    title: 'Start with what needs attention',
    body: 'Blocked and overdue tasks show up here first.',
  },
  {
    path: 'board',
    target: '[data-task-id="t-7"]',
    title: 'Move work across the board',
    body: 'Drag this card to Ready for Review, or use its More actions menu.',
    // Shown once the card has moved, however it was moved.
    done: (tasks) => {
      const task = tasks?.find((item) => item.id === 't-7')
      return Boolean(task && task.status !== 'IN_PROGRESS')
    },
    success: 'Moved. The whole team sees it.',
  },
  {
    path: 'board',
    target: '[data-task-id="t-6"]',
    title: 'Blocked is a flag, not a column',
    body: 'A blocked task keeps its place and shows why it is stuck.',
  },
  {
    path: 'board',
    target: '[data-tour="chat"]',
    title: 'Talk right next to the work',
    body: 'Message the team. Type # to mention a task.',
  },
  {
    path: 'report',
    target: '[data-tour="generate-report"]',
    title: 'Ask for a project report',
    body: 'Get a summary, warnings and suggestions. It never changes your project.',
  },
  {
    path: 'members',
    target: '[data-tour="members"]',
    title: 'Invite your team and set access',
    body: 'Invite teammates and choose what each person can edit.',
  },
  {
    path: null,
    target: null,
    title: 'You are ready to plan',
    body: 'Keep exploring, or create your own account.',
  },
]

const MARGIN = 12
const GAP = 14
const CARD_WIDTH = 360
const PHONE = 640

function sameBox(a, b) {
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

// The target's box, grown to include any menu it has open (a card's More actions menu hangs below it).
function targetBox(node) {
  const boxes = [node, ...node.querySelectorAll('[role="menu"]')].map((item) => item.getBoundingClientRect())
  const top = Math.min(...boxes.map((box) => box.top))
  const left = Math.min(...boxes.map((box) => box.left))
  const bottom = Math.max(...boxes.map((box) => box.bottom))
  const right = Math.max(...boxes.map((box) => box.right))
  return { top, left, bottom, right, width: right - left, height: bottom - top }
}

// A modal window (task details, a confirmation) or the phone sidebar makes the rest of the page
// inert, so the tour steps aside until it closes.
function somethingModalIsOpen() {
  return Boolean(document.querySelector('dialog[open]') || document.getElementById('mobile-sidebar'))
}

function placeCard(box, height) {
  const width = Math.min(CARD_WIDTH, window.innerWidth - MARGIN * 2)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  if (viewportWidth < PHONE) return { phone: true }
  if (!box) return { left: (viewportWidth - width) / 2, top: Math.max(MARGIN, (viewportHeight - height) / 2), width }

  const clampLeft = (value) => Math.min(Math.max(value, MARGIN), viewportWidth - width - MARGIN)
  const clampTop = (value) => Math.min(Math.max(value, MARGIN), viewportHeight - height - MARGIN)
  const centredLeft = clampLeft(box.left + box.width / 2 - width / 2)

  if (viewportWidth - box.right >= width + GAP + MARGIN && box.height < viewportHeight * 0.6) {
    return { left: box.right + GAP, top: clampTop(box.top), width }
  }
  if (viewportHeight - box.bottom >= height + GAP + MARGIN) return { left: centredLeft, top: box.bottom + GAP, width }
  if (box.top >= height + GAP + MARGIN) return { left: centredLeft, top: box.top - GAP - height, width }
  if (box.left >= width + GAP + MARGIN) return { left: box.left - GAP - width, top: clampTop(box.top), width }
  return { left: clampLeft(viewportWidth - width - MARGIN), top: viewportHeight - height - MARGIN, width }
}

// Shown on a step that asks the visitor to do something, once it is done.
function StepSuccess({ step }) {
  const tasks = useTasks(DEMO_PROJECT_ID)
  if (!step.done?.(tasks.data)) return null
  return (
    <p role="status" className="mt-3 flex items-start gap-2 rounded-[10px] bg-nav-active px-3 py-2 text-sm font-medium text-heading">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="8" fill="var(--color-status-done)" />
        <path d="m4.6 8.3 2.2 2.2 4.6-4.9" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {step.success}
    </p>
  )
}

function TourCard({ index }) {
  const step = TOUR_STEPS[index]
  const last = index === TOUR_STEPS.length - 1
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const leaveDemo = useLeaveDemo()
  const cardRef = useRef(null)
  const headingRef = useRef(null)
  const [box, setBox] = useState(null)
  const [searching, setSearching] = useState(Boolean(step.target))
  const [modalOpen, setModalOpen] = useState(false)
  const [cardHeight, setCardHeight] = useState(220)
  const [, setViewport] = useState(0)
  // A new step starts without a target until its page has drawn it.
  const [shownIndex, setShownIndex] = useState(index)
  if (shownIndex !== index) {
    setShownIndex(index)
    setBox(null)
    setSearching(Boolean(step.target))
  }

  // The card is placed from its height, which changes with the step's text and the success note.
  useEffect(() => {
    const card = cardRef.current
    if (!card || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => setCardHeight(card.offsetHeight))
    observer.observe(card)
    return () => observer.disconnect()
  }, [modalOpen])

  // Each step opens its page of the sample project.
  useEffect(() => {
    if (!step.path) return
    const page = `/projects/${DEMO_PROJECT_ID}/${step.path}`
    if (window.location.pathname !== page) navigate(page)
  }, [index, step.path, navigate])

  // Finds the step's target once its page has loaded, brings it into view and follows it while the
  // page scrolls or changes size.
  useEffect(() => {
    if (!step.target) return undefined
    let node = null
    let frame = 0
    let tries = 0
    let observer = null
    let measureQueued = false

    function measure() {
      measureQueued = false
      if (!node?.isConnected) {
        node = null
        frame = requestAnimationFrame(find)
        return
      }
      const next = targetBox(node)
      setBox((previous) => (previous && sameBox(previous, next) ? previous : next))
    }
    function queueMeasure() {
      if (measureQueued) return
      measureQueued = true
      requestAnimationFrame(measure)
    }
    function find() {
      node = document.querySelector(step.target)
      if (!node) {
        tries += 1
        if (tries < 240) frame = requestAnimationFrame(find)
        else setSearching(false)
        return
      }
      setSearching(false)
      const behavior = reducedMotion() ? 'auto' : 'smooth'
      // Sideways first (the phone board scrolls between columns), then the page itself.
      node.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'auto' })
      const rect = node.getBoundingClientRect()
      const phone = window.innerWidth < PHONE
      const top = phone ? window.scrollY + rect.top - 120 : window.scrollY + rect.top - Math.max(96, (window.innerHeight - rect.height) / 2)
      window.scrollTo({ top: Math.max(0, top), behavior })
      setBox(targetBox(node))
      observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(queueMeasure)
      observer?.observe(node)
      observer?.observe(document.body)
    }

    frame = requestAnimationFrame(find)
    window.addEventListener('scroll', queueMeasure, { capture: true, passive: true })
    window.addEventListener('resize', queueMeasure)
    // A card that moves column slides there with a transform, which no observer reports, so check
    // the target's place a few times a second as well.
    const poll = window.setInterval(() => node && queueMeasure(), 250)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(poll)
      observer?.disconnect()
      window.removeEventListener('scroll', queueMeasure, { capture: true })
      window.removeEventListener('resize', queueMeasure)
    }
  }, [index, step.target, pathname])

  // Steps aside while a modal window is open, and comes back when it closes.
  useEffect(() => {
    const check = () => setModalOpen(somethingModalIsOpen())
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    // The card's place depends on the window size, even when the step has no target.
    const onResize = () => setViewport((value) => value + 1)
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // The card takes focus when its step opens, so a screen reader reads the new step.
  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [index, modalOpen])

  function close() {
    setTourStep(null)
    requestAnimationFrame(() => (document.getElementById('demo-restart-tour') ?? document.getElementById('main'))?.focus())
  }

  if (modalOpen) return null
  const position = placeCard(box, cardHeight)
  const pad = 6

  return createPortal(
    <>
      {/* The page dims around the lit-up target; clicks pass through to the page. */}
      {box ? (
        <div
          aria-hidden="true"
          className="tour-spotlight pointer-events-none fixed top-0 left-0 z-[60] rounded-[16px]"
          style={{
            width: box.width + pad * 2,
            height: box.height + pad * 2,
            transform: `translate(${box.left - pad}px, ${box.top - pad}px)`,
          }}
        />
      ) : (
        !searching && <div aria-hidden="true" className="tour-dim pointer-events-none fixed inset-0 z-[60]" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-body"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            close()
          }
        }}
        className={`tour-card fixed z-[61] rounded-[18px] border border-line bg-white p-5 shadow-[0_24px_60px_-12px_rgba(20,31,23,0.38)] ${
          position.phone ? 'inset-x-3 bottom-3' : ''
        } ${searching ? 'opacity-0' : 'opacity-100'}`}
        style={position.phone ? undefined : { left: position.left, top: position.top, width: position.width }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-action">
            Step {index + 1} of {TOUR_STEPS.length}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close tour"
            className="-mt-2 -mr-2 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-heading sm:size-9"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <h2 id="tour-step-title" ref={headingRef} tabIndex={-1} className="text-lg leading-snug font-semibold text-heading focus:outline-none">
          {step.title}
        </h2>
        <p id="tour-step-body" className="mt-1.5 text-sm leading-relaxed text-muted">
          {step.body}
        </p>
        {step.done && <StepSuccess step={step} />}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span aria-hidden="true" className="flex gap-1">
            {TOUR_STEPS.map((item, dot) => (
              <span key={item.title} className={`h-1.5 rounded-full transition-[width] duration-200 ${dot === index ? 'w-4 bg-action' : 'w-1.5 bg-surface-subtle'}`} />
            ))}
          </span>
          <span className="ml-auto flex gap-2">
            {last ? (
              <>
                <Button variant="secondary" onClick={close}>
                  Keep exploring
                </Button>
                <Button onClick={() => leaveDemo('/sign-in')}>Create an account</Button>
              </>
            ) : (
              <>
                {index > 0 && (
                  <Button variant="secondary" onClick={() => setTourStep(index - 1)}>
                    Back
                  </Button>
                )}
                <Button onClick={() => setTourStep(index + 1)}>Next</Button>
              </>
            )}
          </span>
        </div>
      </div>
    </>,
    document.body,
  )
}

export default function ProductTour() {
  const step = useTourStep()
  if (step === null || !TOUR_STEPS[step]) return null
  return <TourCard index={step} />
}
