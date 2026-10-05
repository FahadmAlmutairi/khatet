import { useMemo, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import StatusIcon from '../../components/StatusIcon.jsx'
import { statusLabel, STATUSES } from '../../lib/domain.js'
import TaskCard, { TaskCardBody } from './TaskCard.jsx'

function Column({ status, tasks, usernames, onOpen, onMove, separated }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status.value}`, data: { type: 'column', status: status.value } })
  const headingId = `column-${status.value}`
  const isBacklog = status.value === 'BACKLOG'

  return (
    <section
      aria-labelledby={headingId}
      className={`relative flex w-[85vw] max-w-80 shrink-0 snap-start flex-col rounded-2xl p-3 sm:w-72 lg:w-auto lg:min-w-52 lg:flex-1 ${
        isBacklog ? 'border border-dashed border-surface-supporting bg-white/60' : 'bg-surface-subtle/50'
      } ${isOver ? 'ring-2 ring-action' : ''} ${separated ? 'mr-4' : ''}`}
    >
      <h2 id={headingId} className="flex items-center gap-2 px-1 pb-2 text-base font-semibold text-heading">
        <StatusIcon status={status.value} />
        {status.label}
        <span className="ml-auto rounded-full bg-white px-2 text-sm font-medium text-muted">
          <span className="sr-only">, </span>
          {tasks.length}
          <span className="sr-only"> {tasks.length === 1 ? 'task' : 'tasks'}</span>
        </span>
      </h2>
      {isBacklog && <p className="px-1 pb-2 text-sm text-muted">Kept apart from active work.</p>}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} usernames={usernames} onOpen={onOpen} onMove={onMove} />
          ))}
          {tasks.length === 0 && (
            <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
              No tasks here. Drop a task here, or use Move to… from a card’s menu.
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

function columnOf(tasks, status) {
  return tasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position)
}

export default function BoardColumns({ tasks, usernames, onOpen, onMove }) {
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const columns = useMemo(() => STATUSES.map((status) => ({ status, tasks: columnOf(tasks, status.value) })), [tasks])
  const titles = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks])
  const activeTask = tasks.find((task) => task.id === activeId)

  function targetOf(over) {
    if (!over) return null
    if (over.data.current?.type === 'column') return { status: over.data.current.status, overId: null }
    return { status: over.data.current?.status, overId: over.id }
  }

  function onDragEnd({ active, over }) {
    setActiveId(null)
    const target = targetOf(over)
    const task = tasks.find((item) => item.id === active.id)
    if (!target?.status || !task) return

    const column = columnOf(tasks, target.status)
    let index
    if (target.status === task.status) {
      index = target.overId ? column.findIndex((item) => item.id === target.overId) : column.length - 1
      if (column[index]?.id === task.id) return
    } else {
      const overIndex = column.findIndex((item) => item.id === target.overId)
      index = overIndex === -1 ? column.length : overIndex
    }
    onMove(task, target.status, index + 1)
  }

  const announcements = {
    onDragStart: ({ active }) => `Picked up ${titles.get(active.id)}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) => {
      const target = targetOf(over)
      return target ? `${titles.get(active.id)} is over ${statusLabel(target.status)}.` : `${titles.get(active.id)} is not over a column.`
    },
    onDragEnd: ({ active, over }) => {
      const target = targetOf(over)
      return target ? `${titles.get(active.id)} was dropped in ${statusLabel(target.status)}.` : `${titles.get(active.id)} was not moved.`
    },
    onDragCancel: ({ active }) => `Moving ${titles.get(active.id)} was cancelled.`,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To pick up a task, press Space or Enter. Use the arrow keys to move it between columns, then press Space or Enter to drop it, or Escape to cancel. You can also use Move to in the task menu.',
        },
      }}
    >
      <nav aria-label="Board columns" className="-mx-4 mb-3 overflow-x-auto px-4 lg:hidden">
        <ul className="flex gap-2">
          {columns.map(({ status, tasks: columnTasks }) => (
            <li key={status.value}>
              <button
                type="button"
                onClick={() =>
                  document.getElementById(`column-${status.value}`)?.closest('section')?.scrollIntoView({ inline: 'start', block: 'nearest' })
                }
                className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-3 text-sm font-medium text-heading"
              >
                <StatusIcon status={status.value} />
                {status.label} · {columnTasks.length}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
        {columns.map(({ status, tasks: columnTasks }) => (
          <Column
            key={status.value}
            status={status}
            tasks={columnTasks}
            usernames={usernames}
            onOpen={onOpen}
            onMove={(task, value) => onMove(task, value)}
            separated={status.value === 'BACKLOG'}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCardBody task={activeTask} usernames={usernames} onOpen={() => {}} onMove={() => {}} isOverlay />}
      </DragOverlay>
    </DndContext>
  )
}
