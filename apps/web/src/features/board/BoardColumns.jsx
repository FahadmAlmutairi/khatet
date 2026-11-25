import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ChevronIcon, PlusIcon } from '../../components/icons.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import InfoTip from '../../components/ui/InfoTip.jsx'
import { ACTIVE_STATUSES, STATUSES } from '../../lib/domain.js'
import { cardRects, EASE, glideCards, playCardMoves, reducedMotion } from '../../lib/motion.js'
import { fullPosition } from './boardPosition.js'
import TaskCard, { TaskCardBody } from './TaskCard.jsx'

const ACCENTS = {
  TODO: 'bg-status-todo',
  IN_PROGRESS: 'bg-status-in-progress',
  READY_FOR_REVIEW: 'bg-status-review',
  DONE: 'bg-status-done',
}

const COLUMN_PREFIX = 'column:'
const isColumnId = (id) => String(id).startsWith(COLUMN_PREFIX)

function Lane({ status, tasks, itemIds, usernames, onOpen, onMove, onReorder, onCreate }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${status.value}`, data: { type: 'column', status: status.value } })
  const headingId = `column-${status.value}`

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={`relative flex min-h-40 w-[calc(100%-24px)] shrink-0 snap-center max-lg:[transform:translateZ(0)] sm:w-[274px] sm:snap-start flex-col gap-3 rounded-[var(--radius-card)] border border-line p-3 transition-colors duration-150 lg:min-h-60 lg:w-auto lg:min-w-0 lg:flex-1 ${
        isOver ? 'bg-nav-active' : 'bg-surface'
      }`}
    >
      {/* No overflow clipping on the lane, so a card menu can open past its bottom edge.
          Below lg the lane gets its own layer (translateZ), so iPhone Safari moves its cards with it while swiping
          instead of drawing them a step behind the lane's border and colour bar. */}
      {/* The accent is clipped to the lane's rounded corners so it lines up with the border below it. */}
      <span aria-hidden="true" className="pointer-events-none absolute -inset-px overflow-hidden rounded-[var(--radius-card)]">
        <span className={`absolute inset-x-0 top-0 h-1 ${ACCENTS[status.value]}`} />
      </span>
      {/* Below lg the status chips above the lanes already name each lane, so the heading is kept for screen readers only. */}
      <h2 id={headingId} className="flex h-6 items-center gap-1.5 text-sm leading-[21px] font-normal text-body max-lg:sr-only">
        <StatusIcon status={status.value} />
        <span>
          {status.label} · {tasks.length}
          <span className="sr-only"> {tasks.length === 1 ? 'task' : 'tasks'}</span>
        </span>
      </h2>
      {/* The ids keep their identity between renders: dnd-kit turns off the make-room slide for a
          render in which the list looks new, so a fresh array each time made cards jump aside. */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-1 flex-col gap-3">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              usernames={usernames}
              onOpen={onOpen}
              onMove={onMove}
              onReorder={onReorder}
              canMoveUp={index > 0}
              canMoveDown={index < tasks.length - 1}
              quiet={status.value === 'DONE'}
            />
          ))}
          {tasks.length === 0 && (
            <li className="flex flex-col items-start gap-2 rounded-[10px] border border-dashed border-line px-3 py-4 text-sm leading-[21px] text-muted">
              No tasks yet.
              {onCreate && (
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-white px-3 text-label font-medium text-heading hover:bg-surface lg:min-h-9"
                >
                  <PlusIcon />
                  Add task
                </button>
              )}
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

// Backlog sits under the lanes, collapsed by default (Figma 324:778, "Backlog / Secondary").
function BacklogPanel({ tasks, itemIds, usernames, onOpen, onMove, onReorder, open, onToggle }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}BACKLOG`, data: { type: 'column', status: 'BACKLOG' } })

  return (
    <section
      ref={setNodeRef}
      id="backlog-panel"
      aria-labelledby="column-BACKLOG"
      className={`rounded-[var(--radius-card)] border p-3 transition-colors duration-150 ${
        isOver ? 'border-action bg-nav-active' : 'border-line bg-surface'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="column-BACKLOG" className="flex items-center gap-1.5 text-sm leading-[21px] font-normal text-body">
          <StatusIcon status="BACKLOG" />
          Backlog · {tasks.length}
          <span className="sr-only"> {tasks.length === 1 ? 'task' : 'tasks'}</span>
          <InfoTip label="About Backlog">Future work. Move a task to To Do when the team is ready to start it.</InfoTip>
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="backlog-tasks"
          className="inline-flex items-center gap-1.5 rounded-control border border-line bg-white px-[18px] py-[13px] text-label font-medium text-heading hover:bg-surface"
        >
          {open ? 'Hide backlog' : 'Show backlog'}
          <ChevronIcon direction={open ? 'up' : 'down'} />
        </button>
      </div>
      <div id="backlog-tasks" hidden={!open}>
        {open && (
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            <ul className="motion-reveal mt-3 flex flex-wrap gap-3">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  className="w-[250px] max-w-full"
                  task={task}
                  usernames={usernames}
                  onOpen={onOpen}
                  onMove={onMove}
                  onReorder={onReorder}
                  canMoveUp={index > 0}
                  canMoveDown={index < tasks.length - 1}
                  upLabel="Move left"
                  downLabel="Move right"
                />
              ))}
              {tasks.length === 0 && <li className="py-2 text-sm text-muted">The backlog is empty.</li>}
            </ul>
          </SortableContext>
        )}
      </div>
    </section>
  )
}

// The picked-up card rises a little; on release it settles into its slot at full size. The card in
// the list stays hidden until then, so only one copy is seen landing.
const dropAnimation = {
  duration: 260,
  easing: EASE,
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } }, className: { dragOverlay: 'card-dropping' } }),
}

function idsByStatus(tasks) {
  const ids = Object.fromEntries(STATUSES.map((status) => [status.value, []]))
  for (const task of [...tasks].sort((a, b) => a.position - b.position)) ids[task.status]?.push(task.id)
  return ids
}

export default function BoardColumns({ tasks, allTasks = tasks, usernames, onOpen, onMove, onCreate }) {
  // Phone: the status chips work as tabs for the lane in view (one lane per screen, with its neighbours peeking in).
  const scrollerRef = useRef(null)
  const [visibleLane, setVisibleLane] = useState(0)
  const chipsRef = useRef(null)
  const [chipsAtEnd, setChipsAtEnd] = useState(false)
  function checkChipsEnd() {
    const nav = chipsRef.current
    if (nav) setChipsAtEnd(nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 1)
  }
  useLayoutEffect(() => {
    checkChipsEnd()
    window.addEventListener('resize', checkChipsEnd)
    return () => window.removeEventListener('resize', checkChipsEnd)
  }, [])
  // Keep the chip of the lane in view centred in the chip row, so it is never cut off after a swipe.
  useEffect(() => {
    const nav = chipsRef.current
    const chip = nav?.querySelectorAll('li')[visibleLane]
    if (!nav || !chip || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollTo({ left: chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' })
  }, [visibleLane])
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [activeId, setActiveId] = useState(null)
  // While a card is dragged, this holds the live order so cards make room as it moves.
  const [dragIds, setDragIds] = useState(null)
  // R-1: after a drop, the order it made stays on screen until the saved order arrives (the move is
  // saved a moment later), so the cards never flick back to their old places and forward again.
  const [landed, setLanded] = useState(null)
  // Where each card was drawn just before the lanes changed, so the cards can glide from there.
  const glideFrom = useRef(null)
  // Just after the dragged card joins another lane, it counts as over itself until the lanes are
  // measured again. Otherwise dnd-kit briefly shifts the new lane's cards using the old positions.
  const justMoved = useRef(false)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])

  // Moves from a menu or the status pill, new tasks and deletions glide into place.
  useLayoutEffect(() => {
    playCardMoves(document)
  }, [tasks])
  const savedIds = useMemo(() => idsByStatus(tasks), [tasks])
  const fullIds = useMemo(() => idsByStatus(allTasks), [allTasks])
  const ids = dragIds ?? (landed?.base === savedIds ? landed.ids : savedIds)

  // Runs after the lanes change during a drag or at the drop: the lane the card leaves closes its
  // gap as smoothly as the lane it joins opens one. The dragged card itself is drawn by the overlay.
  useLayoutEffect(() => {
    const from = glideFrom.current
    if (!from) return
    glideFrom.current = null
    glideCards(document, from.rects, { skip: from.skip, add: true })
  }, [dragIds, landed])

  // While a card is dragged the lanes may grow but never shrink. When the card left the tallest
  // lane, every lane got shorter, the pointer ended up below them all and the card jumped back.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (activeId) {
      scroller.style.minHeight = `${Math.max(parseFloat(scroller.style.minHeight) || 0, scroller.offsetHeight)}px`
      return
    }
    // After the drop, the lanes take their own height once the card has landed.
    const timer = setTimeout(() => {
      scroller.style.minHeight = ''
    }, 300)
    return () => clearTimeout(timer)
  }, [activeId, dragIds])

  useEffect(() => {
    if (!justMoved.current) return
    const frame = requestAnimationFrame(() => {
      justMoved.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [dragIds])
  const columnTasks = (status) => ids[status].map((id) => byId.get(id)).filter(Boolean)
  const activeTask = activeId ? byId.get(activeId) : null

  function containerOf(id, current = ids) {
    if (isColumnId(id)) return String(id).slice(COLUMN_PREFIX.length)
    return Object.keys(current).find((status) => current[status].includes(id))
  }

  // Prefer the card under the pointer; between cards, use the nearest card in that lane.
  function collisionDetection(args) {
    if (justMoved.current && args.active) return [{ id: args.active.id }]
    // The backlog panel moves down when a lane grows mid-drag, and dnd-kit keeps its old
    // rectangle, so check the live position of the collapsed panel first.
    const pointer = args.pointerCoordinates
    const panel = document.getElementById('backlog-panel')?.getBoundingClientRect()
    if (!backlogOpen && pointer && panel && pointer.y >= panel.top && pointer.y <= panel.bottom && pointer.x >= panel.left && pointer.x <= panel.right) {
      const container = args.droppableContainers.find((item) => item.id === `${COLUMN_PREFIX}BACKLOG`)
      if (container) return [{ id: container.id, data: { droppableContainer: container, value: 0 } }]
    }
    const hits = pointerWithin(args)
    const found = hits.length ? hits : rectIntersection(args)
    const cardHits = found.filter((hit) => !isColumnId(hit.id))
    if (cardHits.length) return cardHits
    const lane = found[0]
    if (!lane) return []
    const laneIds = ids[containerOf(lane.id)] ?? []
    if (laneIds.length === 0) return [lane]
    const containers = args.droppableContainers.filter((container) => laneIds.includes(container.id))
    // R-1: the card nearest the pointer, measured at the cards' resting places. Below the last card
    // that is always the last card, so the slot no longer flips back and forth at the end of a lane.
    if (pointer) {
      let nearest = null
      for (const container of containers) {
        const rect = args.droppableRects.get(container.id)
        if (!rect) continue
        const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right)
        const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom)
        const value = Math.hypot(dx, dy)
        if (!nearest || value < nearest.data.value) nearest = { id: container.id, data: { droppableContainer: container, value } }
      }
      if (nearest) return [nearest]
    }
    const nearest = closestCenter({ ...args, droppableContainers: containers })
    return nearest.length ? nearest : [lane]
  }

  function onDragStart({ active }) {
    setActiveId(active.id)
    setDragIds(ids)
    setLanded(null)
  }

  function onDragOver({ active, over }) {
    if (!over) return
    const from = containerOf(active.id)
    const to = containerOf(over.id)
    if (from && to && from !== to && (to !== 'BACKLOG' || backlogOpen)) {
      glideFrom.current = { rects: cardRects(document), skip: active.id }
      justMoved.current = true
    }
    setDragIds((current) => {
      if (!current) return current
      const from = containerOf(active.id, current)
      const to = containerOf(over.id, current)
      if (!from || !to || from === to) return current
      if (to === 'BACKLOG' && !backlogOpen) return current
      const target = current[to].filter((id) => id !== active.id)
      let index = target.length
      if (!isColumnId(over.id)) {
        const overIndex = target.indexOf(over.id)
        const translated = active.rect.current.translated
        // Centre against centre, the same test the pointer makes, so the slot is not placed on one
        // side of a card and then moved to the other by dnd-kit a frame later.
        const below = translated && translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2
        index = overIndex + (below ? 1 : 0)
      }
      return {
        ...current,
        [from]: current[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), active.id, ...target.slice(index)],
      }
    })
  }

  function finish() {
    setActiveId(null)
    setDragIds(null)
  }

  function onDragEnd({ active, over }) {
    const task = byId.get(active.id)
    const current = dragIds ?? savedIds
    // The cards are measured where they are drawn now, before the drag's shifts are taken away.
    const rects = cardRects(document)
    finish()
    if (!task || !over) return

    const overContainer = containerOf(over.id, current)
    let status
    let order
    if (overContainer === 'BACKLOG' && !backlogOpen) {
      status = 'BACKLOG'
      order = [...current.BACKLOG.filter((id) => id !== task.id), task.id]
    } else {
      status = containerOf(active.id, current)
      const items = current[status]
      const from = items.indexOf(active.id)
      const to = overContainer === status && !isColumnId(over.id) ? items.indexOf(over.id) : from
      order = arrayMove(items, from, to)
    }
    const position = fullPosition(order, task.id, fullIds[status] ?? [])

    const savedPosition = fullIds[task.status].indexOf(task.id) + 1
    if (status === task.status && position === savedPosition) return
    const landedIds = Object.fromEntries(Object.entries(current).map(([key, list]) => [key, list.filter((id) => id !== task.id)]))
    landedIds[status] = order
    glideFrom.current = { rects, skip: task.id }
    setLanded({ base: savedIds, ids: landedIds })
    onMove(task, status, position, { dragged: true })
  }

  // "Move up" and "Move down" in the card menu: the keyboard and single-tap way to reorder (WCAG 2.1.1, 2.5.7).
  function reorder(task, step) {
    const visible = savedIds[task.status]
    const from = visible.indexOf(task.id)
    const to = from + step
    if (from < 0 || to < 0 || to >= visible.length) return
    onMove(task, task.status, fullPosition(arrayMove(visible, from, to), task.id, fullIds[task.status]))
  }

  // Phone lanes snap to the centre so both neighbours peek in; wider screens snap to the start.
  function snapsToStart(lane) {
    return getComputedStyle(lane).scrollSnapAlign.startsWith('start')
  }

  // The lane in view is the one closest to where lanes snap.
  function onScrollLanes(event) {
    const scroller = event.currentTarget
    const lanes = [...scroller.querySelectorAll(':scope > section')]
    if (!lanes.length) return
    const box = scroller.getBoundingClientRect()
    const toStart = snapsToStart(lanes[0])
    const anchor = toStart ? box.left + parseFloat(getComputedStyle(scroller).scrollPaddingLeft || 0) : box.left + box.width / 2
    let closest = 0
    let distance = Infinity
    lanes.forEach((lane, index) => {
      const rect = lane.getBoundingClientRect()
      const gap = Math.abs((toStart ? rect.left : rect.left + rect.width / 2) - anchor)
      if (gap < distance) {
        distance = gap
        closest = index
      }
    })
    setVisibleLane(closest)
  }

  function showLane(index) {
    const scroller = scrollerRef.current
    const lane = scroller?.querySelectorAll(':scope > section')[index]
    if (!lane) return
    // Scroll only the lanes, not the page.
    const left = snapsToStart(lane)
      ? lane.offsetLeft - parseFloat(getComputedStyle(scroller).scrollPaddingLeft || 0)
      : lane.offsetLeft - (scroller.clientWidth - lane.offsetWidth) / 2
    scroller.scrollTo({ left, behavior: 'smooth' })
    setVisibleLane(index)
  }

  const announcements = {
    onDragStart: ({ active }) => `Picked up ${byId.get(active.id)?.title}.`,
    onDragOver: () => undefined,
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) => `Moving ${byId.get(active.id)?.title} was cancelled.`,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: 'Use the task menu to move a task to another stage, or up and down within its stage.' },
      }}
    >
      {/* A soft fade at the right edge shows the chip row scrolls; it goes once the last chip is in view. */}
      <div className="relative -mx-4 mb-3 lg:hidden">
        <nav
          aria-label="Board columns"
          ref={chipsRef}
          onScroll={checkChipsEnd}
          className="relative overflow-x-auto px-4"
        >
          <ul className="flex w-max gap-2">
            {ACTIVE_STATUSES.map((status, index) => (
              <li key={status.value}>
                <button
                  type="button"
                  onClick={() => showLane(index)}
                  aria-current={visibleLane === index ? 'true' : undefined}
                  className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium text-heading ${
                    visibleLane === index ? 'border-action bg-nav-active' : 'border-line bg-white'
                  }`}
                >
                  <StatusIcon status={status.value} />
                  {status.label} · {ids[status.value].length}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {!chipsAtEnd && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-surface to-transparent" />
        )}
      </div>
      <div
        ref={scrollerRef}
        onScroll={onScrollLanes}
        className={`relative -mx-4 flex ${activeId ? '' : 'snap-x snap-mandatory'} scroll-px-4 gap-3 overflow-x-auto sm:gap-4 px-4 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0`}
      >
        {ACTIVE_STATUSES.map((status) => (
          <Lane
            key={status.value}
            status={status}
            tasks={columnTasks(status.value)}
            itemIds={ids[status.value]}
            usernames={usernames}
            onOpen={onOpen}
            onMove={onMove}
            onReorder={reorder}
            onCreate={status.value === 'TODO' ? onCreate : undefined}
          />
        ))}
      </div>
      <div className="mt-6">
        <BacklogPanel
          tasks={columnTasks('BACKLOG')}
          itemIds={ids.BACKLOG}
          usernames={usernames}
          onOpen={onOpen}
          onMove={onMove}
          onReorder={reorder}
          open={backlogOpen}
          onToggle={() => setBacklogOpen((value) => !value)}
        />
      </div>
      <DragOverlay dropAnimation={reducedMotion() ? null : dropAnimation}>
        {activeTask && (
          <div className="card-pickup cursor-grabbing">
            <TaskCardBody task={activeTask} usernames={usernames} onOpen={() => {}} onMove={() => {}} isOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

