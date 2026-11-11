import { useEffect, useRef } from 'react'

// After a failed submit, focus moves to the first invalid field (review M3). Put the ref on the form.
export function useFocusFirstInvalid(error) {
  const ref = useRef(null)
  useEffect(() => {
    if (error) ref.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [error])
  return ref
}
