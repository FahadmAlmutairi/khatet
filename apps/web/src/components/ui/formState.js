import { useEffect } from 'react'

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
