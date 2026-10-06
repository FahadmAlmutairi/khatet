import { useEffect } from 'react'

// After a failed save, move focus to the first field the API flagged (WCAG 3.3.1).
export function useFocusFirstError(formRef, error) {
  useEffect(() => {
    if (!error?.fieldErrors?.length) return
    const field = formRef.current?.querySelector('[aria-invalid="true"], [data-invalid="true"] input, [data-invalid="true"] button')
    field?.focus()
  }, [formRef, error])
}

export function sameValues(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}
