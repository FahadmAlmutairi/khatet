import { useEffect } from 'react'

// G12: each page names itself in the browser tab, most specific part first.
export function useDocumentTitle(...parts) {
  const title = [...parts.filter(Boolean), 'Khatet'].join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}

// The landing page's title, also set in index.html for search results and link previews.
export const HOME_TITLE = 'Khatet: project management for small teams'
