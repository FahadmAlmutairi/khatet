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
import { EASE, playCardMoves } from '../../lib/motion.js'
import TaskCard, { TaskCardBody } from './TaskCard.jsx'

const ACCENTS = {
  TODO: 'bg-status-todo',
  IN_PROGRESS: 'bg-status-in-progress',
  READY_FOR_REVIEW: 'bg-status-review',
  DONE: 'bg-status-done',
}

const COLUMN_PREFIX = 'column:'
const isColumnId = (id) => String(id).startsWith(COLUMN_PREFIX)

function Lane({ status, tasks, usernames, onOpen, onMove, onCreate }) {
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
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-1 flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} usernames={usernames} onOpen={onOpen} onMove={onMove} quiet={status.value === 'DONE'} />
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
function BacklogPanel({ tasks, usernames, onOpen, onMove, open, onToggle }) {
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
          <SortableContext items={tasks.map((task) => task.id)} strategy={rectSortingStrategy}>
            <ul className="motion-reveal mt-3 flex flex-wrap gap-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} className="w-[250px] max-w-full" task={task} usernames={usernames} onOpen={onOpen} onMove={onMove} />
              ))}
              {tasks.length === 0 && <li className="py-2 text-sm text-muted">The backlog is empty.</li>}
            </ul>
          </SortableContext>
        )}
      </div>
    </section>
  )
}

// The picked-up card rises a little; on release it settles into its slot at full size.
const dropAnimation = {
  duration: 260,
  easing: EASE,
  sideEffects: defaultDropAnimationSideEffects({ className: { dragOverlay: 'card-dropping' } }),
}

function idsByStatus(tasks) {
  const ids = Object.fromEntries(STATUSES.map((status) => [status.value, []]))
  for (const task of [...tasks].sort((a, b) => a.position - b.position)) ids[task.status]?.push(task.id)
  return ids
}

export default function BoardColumns({ tasks, usernames, onOpen, onMove, onCreate }) {
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
  const ids = dragIds ?? savedIds
  const columnTasks = (status) => ids[status].map((id) => byId.get(id)).filter(Boolean)
  const activeTask = activeId ? byId.get(activeId) : null

  function containerOf(id, current = ids) {
    if (isColumnId(id)) return String(id).slice(COLUMN_PREFIX.length)
    return Object.keys(current).find((status) => current[status].includes(id))
  }

  // Prefer the card under the pointer; between cards, use the nearest card in that lane.
  function collisionDetection(args) {
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
    const nearest = closestCenter({ ...args, droppableContainers: containers })
    return nearest.length ? nearest : [lane]
  }

  function onDragStart({ active }) {
    setActiveId(active.id)
    setDragIds(savedIds)
  }

  function onDragOver({ active, over }) {
    if (!over) return
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
        const below = translated && translated.top > over.rect.top + over.rect.height / 2
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
    finish()
    if (!task || !over) return

    const overContainer = containerOf(over.id, current)
    let status
    let position
    if (overContainer === 'BACKLOG' && !backlogOpen) {
      status = 'BACKLOG'
      position = current.BACKLOG.filter((id) => id !== task.id).length + 1
    } else {
      status = containerOf(active.id, current)
      const items = current[status]
      const from = items.indexOf(active.id)
      const to = overContainer === status && !isColumnId(over.id) ? items.indexOf(over.id) : from
      position = arrayMove(items, from, to).indexOf(active.id) + 1
    }

    const savedPosition = savedIds[task.status].indexOf(task.id) + 1
    if (status === task.status && position === savedPosition) return
    onMove(task, status, position, { dragged: true })
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
        screenReaderInstructions: { draggable: 'Use Move to in the task menu to move a task between stages.' },
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
            usernames={usernames}
            onOpen={onOpen}
            onMove={onMove}
            onCreate={status.value === 'TODO' ? onCreate : undefined}
          />
        ))}
      </div>
      <div className="mt-6">
        <BacklogPanel
          tasks={columnTasks('BACKLOG')}
          usernames={usernames}
          onOpen={onOpen}
          onMove={onMove}
          open={backlogOpen}
          onToggle={() => setBacklogOpen((value) => !value)}
        />
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask && (
          <div className="card-pickup cursor-grabbing">
            <TaskCardBody task={activeTask} usernames={usernames} onOpen={() => {}} onMove={() => {}} isOverlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

