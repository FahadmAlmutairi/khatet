import StatusIcon from '../../components/StatusIcon.jsx'
import { STATUSES } from '../../lib/domain.js'

// The status list used by the card menu and the status button in task details (US-16).
// Choosing the current status does nothing.
export function moveMenuItems(task, onMove, { heading = 'Move to', note = false } = {}) {
  return [
    { key: 'heading', heading },
    ...STATUSES.map((status) => ({
      key: status.value,
      label: status.label,
      icon: <StatusIcon status={status.value} />,
      current: task.status === status.value,
      onSelect: () => {
        if (task.status !== status.value) onMove(task, status.value)
      },
    })),
    ...(note
      ? [
          task.isBlocked
            ? {
                key: 'note',
                tone: 'warning',
                note: 'Moving this task out of In Progress removes its Blocked flag and reason. Undo brings them back.',
              }
            : { key: 'note', note: 'Backlog keeps the task’s details and assignees.' },
        ]
      : []),
  ]
}
