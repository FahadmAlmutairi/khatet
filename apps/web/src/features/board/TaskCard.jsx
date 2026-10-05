import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AvatarStack } from '../../components/Avatar.jsx'
import { CalendarIcon, MoreIcon } from '../../components/icons.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import Menu from '../../components/ui/Menu.jsx'
import { formatDueDate } from '../../lib/domain.js'
import { moveMenuItems } from './moveMenu.jsx'

export function BlockedPill({ reason }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-priority-high-bg px-2 py-0.5 text-xs font-semibold text-blocked">
      <StatusIcon status="BLOCKED" />
      <span className="truncate">Blocked{reason ? ` · ${reason}` : ''}</span>
    </span>
  )
}

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
      {[3, 8, 13].map((y) => (
        <g key={y}>
          <circle cx="3.5" cy={y} r="1.2" />
          <circle cx="8.5" cy={y} r="1.2" />
        </g>
      ))}
    </svg>
  )
}

export function TaskCardBody({ task, usernames, onOpen, onMove, dragHandle, isOverlay = false }) {
  const assignees = task.assigneeIds.map((id) => ({ id, username: usernames.get(id) ?? 'unknown' }))
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-card ${
        isOverlay ? 'shadow-lg ring-2 ring-action' : ''
      }`}
    >
      <div className="flex items-start gap-1">
        {dragHandle}
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(task.id)}
            className="block min-h-11 w-full py-2 text-left text-base font-medium text-heading hover:underline"
          >
            {task.title}
          </button>
        </h3>
        {!isOverlay && (
          <Menu
            label={`More actions for ${task.title}`}
            buttonContent={<MoreIcon />}
            buttonClassName="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-heading"
            items={[
              ...(task.permissions.canMove ? moveMenuItems(task, onMove) : []),
              { key: 'open', label: 'Open task details', onSelect: () => onOpen(task.id) },
            ]}
          />
        )}
      </div>
      {task.isBlocked && (
        <div className="mt-1">
          <BlockedPill reason={task.blockedReason} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <AvatarStack users={assignees} />
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <CalendarIcon />
            <span className="sr-only">Due </span>
            {formatDueDate(task.dueDate, { short: true })}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TaskCard({ task, usernames, onOpen, onMove }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
    disabled: !task.permissions.canMove,
  })

  const style = { transform: CSS.Translate.toString(transform), transition }

  const handle = task.permissions.canMove ? (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Drag ${task.title}`}
      aria-roledescription="draggable task"
      className="-ml-1 inline-flex h-11 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:bg-surface active:cursor-grabbing"
    >
      <GripIcon />
    </button>
  ) : null

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'rounded-[var(--radius-card)] outline-2 outline-dashed outline-surface-supporting [&>*]:opacity-30' : ''}>
      <TaskCardBody task={task} usernames={usernames} onOpen={onOpen} onMove={onMove} dragHandle={handle} />
    </li>
  )
}
