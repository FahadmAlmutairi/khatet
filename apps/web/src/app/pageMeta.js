import { useEffect } from 'react'

// G12: each page names itself in the browser tab, most specific part first.
export function useDocumentTitle(...parts) {
  const title = [...parts.filter(Boolean), 'Khatet'].join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}
