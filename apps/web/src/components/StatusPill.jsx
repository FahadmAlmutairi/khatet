import { statusLabel } from '../lib/domain.js'
import { STATUS_TONES } from '../lib/statusTones.js'
import StatusIcon from './StatusIcon.jsx'

export default function StatusPill({ status, className = '' }) {
  return (
    <span className={`inline-flex h-7 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${STATUS_TONES[status]} ${className}`}>
      <StatusIcon status={status} />
      {statusLabel(status)}
    </span>
  )
}
