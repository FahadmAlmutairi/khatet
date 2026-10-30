import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router'
import { useProjects } from '../api/hooks.js'

// G12: each page names itself in the browser tab, most specific part first.
export function useDocumentTitle(...parts) {
  const title = [...parts.filter(Boolean), 'Khatet'].join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}

const PAGES = { board: 'Board', members: 'Members' }

// G6 and G7: where the user is, shared by the top bar (desktop) and the page (phone).
export function useBreadcrumb() {
  const { projectId } = useParams()
  const { pathname } = useLocation()
  const projects = useProjects()

  const home = { label: 'Home', to: '/projects' }
  if (pathname === '/projects') return [{ label: 'Home' }]
  if (pathname === '/account') return [home, { label: 'Account settings' }]
  if (!projectId) return [home, { label: 'Page not found' }]

  const project = projects.data?.find((item) => item.id === projectId)
  const page = PAGES[pathname.split('/').at(-1)]
  return [home, project && { label: project.name, to: `/projects/${projectId}/board` }, page && { label: page }].filter(Boolean)
}
