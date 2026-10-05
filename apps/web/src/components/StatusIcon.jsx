// Shape-coded status icons exported from the Figma "Status Icon" component.
// Always shown next to a text label: colour is never the only signal.
const ICONS = {
  BACKLOG: (
    <circle cx="6" cy="6" r="5.25" stroke="#59635B" strokeWidth="1.5" strokeDasharray="2.2 1.8" />
  ),
  TODO: (
    <circle cx="6" cy="6" r="5.25" stroke="#4E5650" strokeWidth="1.5" />
  ),
  IN_PROGRESS: (
    <>
      <circle cx="6" cy="6" r="5.25" stroke="#17665B" strokeWidth="1.5" />
      <path d="M6 0a6 6 0 0 1 0 12V0Z" fill="#17665B" />
    </>
  ),
  READY_FOR_REVIEW: (
    <>
      <circle cx="6" cy="6" r="5.25" stroke="#7A5310" strokeWidth="1.5" />
      <circle cx="6" cy="6" r="2.5" fill="#7A5310" />
    </>
  ),
  DONE: (
    <>
      <circle cx="6" cy="6" r="6" fill="#246B3A" />
      <path
        d="M3.2 6.3 5.2 8.2l3.6-4"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  BLOCKED: (
    <>
      <circle cx="6" cy="6" r="6" fill="#A63A32" />
      <rect x="3" y="5.1" width="6" height="1.8" rx="0.9" fill="white" />
    </>
  ),
}

export default function StatusIcon({ status, className = '' }) {
  const shape = ICONS[status] ?? ICONS.TODO
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {shape}
    </svg>
  )
}
