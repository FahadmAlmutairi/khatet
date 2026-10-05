import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AvatarStack } from '../../components/Avatar.jsx'
import { MoreIcon } from '../../components/icons.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import Menu from '../../components/ui/Menu.jsx'
import { dueLine } from '../../lib/domain.js'
import { moveMenuItems } from './moveMenu.jsx'

export function BlockedPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-priority-high-bg px-2 py-0.5 text-xs font-medium text-priority-high-text">
      <StatusIcon status="BLOCKED" />
      Blocked
    </span>
  )
}

// Card layout from Figma page 08, Board (324:778): title, due line, blocked pill,
// then priority on the left and assignees with the actions button on the right.
export function TaskCardBody({ task, usernames, onOpen, onMove, isOverlay = false }) {
  const assignees = task.assigneeIds.map((id) => ({ id, username: usernames.get(id) ?? 'unknown' }))
  const due = dueLine(task.dueDate, task.status)

  return (
    <div
      className={`flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-line bg-white p-3 ${
        isOverlay ? 'shadow-[0_12px_24px_rgba(48,65,54,0.16)]' : 'shadow-[0_2px_4px_rgba(48,65,54,0.05)] hover:border-surface-supporting'
      }`}
    >
      <h3 className="min-h-[42px] w-full">
        <button
          type="button"
          onClick={() => onOpen(task.id)}
          className="line-clamp-2 w-full text-left text-sm leading-[21px] text-body"
        >
          {task.title}
        </button>
      </h3>
      <p className={`text-xs font-medium leading-4 ${due.overdue ? 'text-attention' : 'text-muted'}`}>
        {due.text}
        {due.overdue && <span className="sr-only">, overdue</span>}
      </p>
      {task.isBlocked && <BlockedPill />}
      <div className="flex w-full items-center justify-between">
        {task.priority ? <PriorityBadge priority={task.priority} /> : <span />}
        <div className="flex items-center gap-1.5">
          <AvatarStack users={assignees} />
          {isOverlay ? (
            <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-white text-heading">
              <MoreIcon />
            </span>
          ) : (
            <Menu
              label={`More actions for ${task.title}`}
              buttonContent={<MoreIcon />}
              buttonClassName="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-heading hover:bg-surface"
              items={[
                ...(task.permissions.canMove ? moveMenuItems(task, onMove) : []),
                { key: 'open', label: 'Open task details', onSelect: () => onOpen(task.id) },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// The whole card is draggable with a mouse or a long press. "Move to…" in the
// card menu is the keyboard and single-tap alternative (WCAG 2.5.7).
export default function TaskCard({ task, usernames, onOpen, onMove, className = '' }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
    disabled: !task.permissions.canMove,
  })

  function openFromCard(event) {
    if (event.target.closest('button, [role="menu"]')) return
    onOpen(task.id)
  }

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      onClick={openFromCard}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`list-none ${className} ${task.permissions.canMove ? 'cursor-grab touch-manipulation' : 'cursor-pointer'} ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TaskCardBody task={task} usernames={usernames} onOpen={onOpen} onMove={onMove} />
    </li>
  )
}
