import Button, { Spinner } from './Button.jsx'

export function LoadingState({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center gap-3 py-12 text-muted">
      <Spinner className="size-5" />
      <span>{label}…</span>
    </div>
  )
}

export function ErrorState({ title = 'This could not be loaded', message, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-line bg-white p-6">
      <h2 className="text-lg font-semibold text-heading">{title}</h2>
      {message && <p className="mt-1 text-base">{message}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <h2 className="text-xl font-semibold text-heading">{title}</h2>
      <div className="max-w-lg text-base text-muted">{children}</div>
      {action}
    </div>
  )
}

export function Notice({ children, tone = 'info' }) {
  const toneClass = tone === 'warning' ? 'border-attention/40 bg-priority-high-bg/40' : 'border-line bg-surface'
  return <div className={`rounded-lg border px-3 py-2.5 text-base ${toneClass}`}>{children}</div>
}
