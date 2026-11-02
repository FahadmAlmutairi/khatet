import { useEffect, useState } from 'react'

// After a failed save, move focus to the first field the API flagged (WCAG 3.3.1).
export function useFocusFirstError(formRef, error) {
  useEffect(() => {
    if (!error?.fieldErrors?.length) return
    const field = formRef.current?.querySelector('[aria-invalid="true"], [data-invalid="true"] input, [data-invalid="true"] button')
    field?.focus()
  }, [formRef, error])
}

// T4: Ctrl+Enter (Cmd+Enter on a Mac) saves the form from any field.
export function submitOnCtrlEnter(event) {
  if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  event.currentTarget.requestSubmit()
}

export const SAVE_SHORTCUT_HINT =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘ + Enter to save' : 'Ctrl + Enter to save'

export function sameValues(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// A field's error from the last save stays until that field is edited, then clears, so the
// message, aria-invalid and the summary count never describe a value that has since changed.
// A new failed save starts over. Errors not tied to a field clear on any edit.
// Returns the error to render (same shape as the mutation's) and a change handler.
export function useLiveFieldErrors(mutation) {
  const [edited, setEdited] = useState([])
  const [lastError, setLastError] = useState(mutation.error)
  if (mutation.error !== lastError) {
    setLastError(mutation.error)
    setEdited([])
  }

  const allFieldErrors = mutation.error?.fieldErrors ?? []
  const fieldErrors = allFieldErrors.filter((item) => !edited.includes(item.field))
  const error = allFieldErrors.length ? { ...mutation.error, fieldErrors } : mutation.error

  function fieldsChanged(fields) {
    if (!mutation.isError) return
    if (!allFieldErrors.length) mutation.reset()
    else setEdited((current) => [...new Set([...current, ...fields])])
  }

  return { error, fieldErrors, fieldsChanged }
}

// The keys whose values differ between two versions of a form's values.
export function changedFields(before, after) {
  return Object.keys(after).filter((key) => !sameValues(before[key], after[key]))
}
