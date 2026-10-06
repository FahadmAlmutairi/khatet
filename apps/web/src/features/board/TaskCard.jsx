import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AvatarStack } from '../../components/Avatar.jsx'
import { MoreIcon, OverdueIcon } from '../../components/icons.jsx'
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
// Done cards sit flatter so the work still open stands out (B3).
export function TaskCardBody({ task, usernames, onOpen, onMove, isOverlay = false, quiet = false }) {
  const assignees = task.assigneeIds.map((id) => ({ id, username: usernames.get(id) ?? 'unknown' }))
  const due = dueLine(task.dueDate, task.status)

  return (
    <div
      className={`group flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-line p-3 ${quiet ? 'bg-surface' : 'bg-white'} ${
        task.isBlocked ? 'border-l-4 border-l-blocked' : ''
      } ${
        isOverlay
          ? 'shadow-[0_12px_24px_rgba(48,65,54,0.16)]'
          : `${quiet ? '' : 'shadow-[0_2px_4px_rgba(48,65,54,0.05)]'} hover:border-surface-supporting`
      }`}
    >
      {/* B2: the title and its due date read as one group. */}
      <div className="flex w-full flex-col gap-1">
        <h3 className="w-full">
          <button
            type="button"
            onClick={() => onOpen(task.id)}
            className="-my-0.5 line-clamp-2 min-h-11 w-full py-0.5 text-left text-sm leading-[21px] text-body lg:min-h-0"
          >
            {task.title}
          </button>
        </h3>
        <p className={`inline-flex items-center gap-1 text-xs font-medium leading-4 ${due.overdue ? 'text-blocked' : 'text-muted'}`}>
          {due.overdue && <OverdueIcon />}
          {due.text}
        </p>
      </div>
      {task.isBlocked && <BlockedPill />}
      <div className="flex w-full items-center justify-between">
        {task.priority ? <PriorityBadge priority={task.priority} /> : <span />}
        <div className="flex items-center gap-1.5">
          <AvatarStack users={assignees} />
          {isOverlay ? (
            <span aria-hidden="true" className="inline-flex size-11 items-center lg:size-8 justify-center rounded-lg border border-line bg-white text-heading">
              <MoreIcon />
            </span>
          ) : (
            // B1: with a mouse the menu button appears on hover or focus; touch screens always show it.
            <span className="[@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100">
              <Menu
                label={`More actions for ${task.title}`}
                buttonContent={<MoreIcon />}
                buttonClassName="inline-flex size-11 shrink-0 lg:size-8 items-center justify-center rounded-lg border border-line bg-white text-heading hover:bg-surface"
                items={[
                  ...(task.permissions.canMove ? moveMenuItems(task, onMove) : []),
                  { key: 'open', label: 'Open task details', onSelect: () => onOpen(task.id) },
                ]}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// The whole card is draggable with a mouse or a long press. "Move to…" in the
// card menu is the keyboard and single-tap alternative (WCAG 2.5.7).
export default function TaskCard({ task, usernames, onOpen, onMove, className = '', quiet = false }) {
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
      data-task-id={task.id}
      {...listeners}
      onClick={openFromCard}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`list-none ${className} ${task.permissions.canMove ? 'cursor-grab touch-manipulation' : 'cursor-pointer'} ${
        isDragging ? 'rounded-[var(--radius-card)] border-2 border-dashed border-surface-supporting bg-nav-active' : ''
      }`}
    >
      {/* B7: while dragged, the card leaves a dashed slot where it will land. */}
      <div className={isDragging ? 'invisible' : undefined}>
        <TaskCardBody task={task} usernames={usernames} onOpen={onOpen} onMove={onMove} quiet={quiet} />
      </div>
    </li>
  )
}
