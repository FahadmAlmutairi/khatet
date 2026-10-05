import StatusIcon from '../../components/StatusIcon.jsx'
import { STATUSES } from '../../lib/domain.js'

// "Move to…" is the keyboard and screen-reader alternative to dragging (US-16).
export function moveMenuItems(task, onMove) {
  return [
    { key: 'heading', heading: 'Move to' },
    ...STATUSES.map((status) => ({
      key: status.value,
      label: status.label,
      icon: <StatusIcon status={status.value} />,
      current: task.status === status.value,
      disabled: task.status === status.value,
      onSelect: () => onMove(task, status.value),
    })),
  ]
}
