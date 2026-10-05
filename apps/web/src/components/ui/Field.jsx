import { useId } from 'react'

const inputClass =
  'min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-body placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked disabled:bg-surface disabled:text-muted'

function FieldShell({ id, label, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-body">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-attention"> *</span>
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
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-blocked">
          {error}
        </p>
      )}
    </div>
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
        className={`${inputClass} border-surface-supporting ${className}`}
        {...props}
      />
    </FieldShell>
  )
}

export function TextArea({ label, required, hint, error, rows = 3, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} border-surface-supporting py-2`}
        {...props}
      />
    </FieldShell>
  )
}

export function SelectField({ label, required, hint, error, options, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClass} border-surface-supporting`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
