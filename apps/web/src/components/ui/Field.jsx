import { useId } from 'react'

const inputClass =
  'min-h-11 w-full rounded-lg border bg-white px-3 text-base text-body placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked disabled:bg-surface disabled:text-muted'

function FieldShell({ id, label, required, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-heading">
        {label}
        {required && (
          <>
            <span aria-hidden="true"> *</span>
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
        className={`${inputClass} border-line ${className}`}
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
        className={`${inputClass} border-line py-2`}
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
        className={`${inputClass} border-line`}
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

// A group of checkboxes for picking several people, for example task assignees.
export function CheckboxGroup({ legend, required, error, options, value, onChange }) {
  const id = useId()
  function toggle(optionValue, checked) {
    onChange(checked ? [...value, optionValue] : value.filter((item) => item !== optionValue))
  }
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-heading">
        {legend}
        {required && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </legend>
      <div
        className={`flex flex-wrap gap-2 rounded-lg ${error ? 'outline-2 outline-offset-2 outline-blocked' : ''}`}
      >
        {options.map((option) => {
          const checked = value.includes(option.value)
          return (
            <label
              key={option.value}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-base ${
                checked ? 'border-action bg-nav-active text-heading' : 'border-line bg-white text-body'
              }`}
            >
              <input
                type="checkbox"
                className="size-4 accent-action"
                checked={checked}
                onChange={(event) => toggle(option.value, event.target.checked)}
              />
              {option.label}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-blocked">
          {error}
        </p>
      )}
    </fieldset>
  )
}
