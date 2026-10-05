const VARIANTS = {
  primary: 'bg-action text-white hover:bg-heading disabled:bg-surface-supporting',
  secondary: 'border border-line bg-white text-heading hover:bg-surface disabled:text-muted',
  ghost: 'text-heading hover:bg-surface-subtle disabled:text-muted',
  danger: 'bg-blocked text-white hover:bg-priority-high-text disabled:opacity-60',
}

const SIZES = {
  md: 'min-h-11 px-4 text-base',
  icon: 'size-11 justify-center',
}

// Every button is at least 44px high (NFR-05) and keeps its label while loading.
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className = 'size-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
