import { forwardRef, useId } from 'react'
import { ErrorIcon } from '../icons.jsx'

const inputClass =
  'min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-body placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked disabled:bg-surface disabled:text-muted'

function FieldShell({ id, label, required, hint, hintClassName = 'text-sm text-muted', error, children }) {
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
        <p id={`${id}-hint`} className={hintClassName}>
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
    <p id={id} role={role} className="flex items-start gap-1.5 text-sm text-blocked">
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

export function TextField({ label, required, hint, hintClassName, error, className = '', ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} hintClassName={hintClassName} error={error}>
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

// Listed above a form after a failed save, so every problem can be read and reached at once.
// Each line moves focus to its field, found by the field's data-field name (WCAG 3.3.1).
export const ErrorSummary = forwardRef(function ErrorSummary({ title, errors, labels }, ref) {
  function focusField(event, field) {
    event.preventDefault()
    const target = event.currentTarget.closest('form')?.querySelector(`[data-field="${field}"]`)
    const control = target?.matches('input, textarea, select, button') ? target : target?.querySelector('input, textarea, button')
    control?.focus()
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="flex flex-col gap-1.5 rounded-control border border-blocked bg-priority-high-bg/30 px-3.5 py-3 text-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-blocked">
        <ErrorIcon />
        {title}
      </p>
      <ul className="flex flex-col gap-1">
        {errors.map((item) => (
          <li key={item.field}>
            <a
              href={`#${item.field}`}
              onClick={(event) => focusField(event, item.field)}
              className="inline-flex min-h-6 items-center text-body underline underline-offset-2 hover:text-heading"
            >
              • {labels[item.field] ?? item.field}: {item.message.charAt(0).toLowerCase()}
              {item.message.slice(1).replace(/\.$/, '')}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
})
