// Navigation icons exported from the Figma file (page 08, Project Sidebar).
export function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.25 7.1 8 2.4l5.75 4.7v5.65c0 .69-.56 1.25-1.25 1.25h-9c-.69 0-1.25-.56-1.25-1.25V7.1Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M6.25 14v-3.75h3.5V14" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  )
}

export function BoardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1.67" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 2v12M10 2v12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export function MembersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10.67 14v-1.33A2.67 2.67 0 0 0 8 10H4a2.67 2.67 0 0 0-2.67 2.67V14" stroke="currentColor" strokeWidth="1.13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="4.67" r="2.67" stroke="currentColor" strokeWidth="1.13" />
      <path d="M14.67 14v-1.33a2.67 2.67 0 0 0-2-2.58M10.67 2.09a2.67 2.67 0 0 1 0 5.17" stroke="currentColor" strokeWidth="1.13" strokeLinecap="round" />
    </svg>
  )
}

export function PanelLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.63" y="3" width="12.75" height="12" rx="1.65" stroke="currentColor" strokeWidth="1.28" />
      <path d="M6.75 3v12" stroke="currentColor" strokeWidth="1.28" strokeLinecap="round" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  )
}

export function CloseIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 8a5 5 0 0 1 10 0c0 5 2 6 2 6H3s2-1 2-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.5 17a1.6 1.6 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronIcon({ direction = 'right', size = 16 }) {
  const rotate = { right: 0, down: 90, left: 180, up: 270 }[direction]
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: `rotate(${rotate}deg)`, transition: 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)' }}>
      <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.75" y="2.75" width="10.5" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.75 5.75h10.5M4.5 1.5v2.5M9.5 1.5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Clock with an alert mark, shown next to overdue dates.
export function OverdueIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="9.8" r="0.8" fill="currentColor" />
    </svg>
  )
}

export function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 14H3.33A1.33 1.33 0 0 1 2 12.67V3.33A1.33 1.33 0 0 1 3.33 2H6M10.67 11.33 14 8l-3.33-3.33M14 8H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0 text-action">
      <path d="m3 7.2 2.6 2.6L11 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Figma "Icon / task" (Notifications panel).
export function TaskCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6.75 8.25 9 10.5 16.5 3M15.75 9v5.25a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V3.75a1.5 1.5 0 0 1 1.5-1.5H12" stroke="currentColor" strokeWidth="1.275" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M12.67 8H3.33M8 12.67 3.33 8 8 3.33" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
    </svg>
  )
}
