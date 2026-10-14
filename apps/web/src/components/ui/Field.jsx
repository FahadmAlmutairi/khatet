import { useId } from 'react'
import { ErrorIcon } from '../icons.jsx'

const inputClass =
  'min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-body placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked disabled:bg-surface disabled:text-muted'

function FieldShell({ id, label, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-body">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-blocked"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  )
}

// An inline error under a field: the icon, then the message (Figma: Create task errors).
export function FieldError({ id, role, children }) {
  return (
    <p id={id} role={role} className="flex items-start gap-1.5 text-sm font-medium text-blocked">
      <span className="flex h-5 items-center">
        <ErrorIcon />
      </span>
      {children}
    </p>
  )
}

function describedBy(id, hint, error) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export function TextField({ label, required, hint, error, className = '', ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        aria-required={required || undefined}
        className={`${inputClass} border-input ${className}`}
        {...props}
      />
    </FieldShell>
  )
}

export function TextArea({ label, required, hint, error, rows = 3, className = '', ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} border-input py-2 ${className}`}
        {...props}
      />
    </FieldShell>
  )
}
