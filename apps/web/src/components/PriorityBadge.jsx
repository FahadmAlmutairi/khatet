const STYLES = {
  HIGH: { label: 'High', className: 'bg-priority-high-bg text-priority-high-text' },
  MEDIUM: { label: 'Medium', className: 'bg-priority-medium-bg text-priority-medium-text' },
  LOW: { label: 'Low', className: 'bg-priority-low-bg text-priority-low-text' },
}

export default function PriorityBadge({ priority }) {
  const style = STYLES[priority]
  if (!style) return null

  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ${style.className}`}>
      <span className="sr-only">Priority: </span>
      {style.label}
    </span>
  )
}
