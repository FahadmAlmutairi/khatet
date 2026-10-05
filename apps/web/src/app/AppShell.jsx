import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router'
import { useMe, useProjects, useSignOut } from '../api/hooks.js'
import Avatar from '../components/Avatar.jsx'
import { BoardIcon, CloseIcon, HomeIcon, MembersIcon, MenuIcon, PlusIcon } from '../components/icons.jsx'
import NotificationsButton from '../features/notifications/NotificationsButton.jsx'

function navClass({ isActive }) {
  return `flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-base ${
    isActive ? 'bg-nav-active font-semibold text-heading' : 'text-nav hover:bg-surface'
  }`
}

function Sidebar({ onNavigate }) {
  const { projectId } = useParams()
  const projects = useProjects()
  const me = useMe()
  const signOut = useSignOut()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <NavLink to="/projects" end className={navClass} onClick={onNavigate}>
          <HomeIcon />
          Home
        </NavLink>

        <div className="mt-6 flex items-center justify-between px-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Projects</h2>
          <Link
            to="/projects?new=project"
            onClick={onNavigate}
            aria-label="Create project"
            className="-mr-3 inline-flex size-11 items-center justify-center rounded-lg text-nav hover:bg-surface"
          >
            <PlusIcon />
          </Link>
        </div>
        <ul className="mt-1 flex flex-col gap-0.5">
          {projects.data?.map((project) => {
            const current = project.id === projectId
            return (
              <li key={project.id}>
                <NavLink
                  to={`/projects/${project.id}/board`}
                  onClick={onNavigate}
                  aria-current={current ? 'true' : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-base ${
                    current ? 'font-semibold text-heading' : 'text-nav hover:bg-surface'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-6 items-center justify-center rounded-md bg-surface-subtle text-xs font-semibold text-heading"
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{project.name}</span>
                </NavLink>
                {current && (
                  <ul className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l border-line pl-2">
                    <li>
                      <NavLink to={`/projects/${project.id}/board`} className={navClass} onClick={onNavigate}>
                        <BoardIcon />
                        Board
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to={`/projects/${project.id}/members`} className={navClass} onClick={onNavigate}>
                        <MembersIcon />
                        Members
                      </NavLink>
                    </li>
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t border-line px-3 py-3">
        <div className="flex items-center gap-2.5 px-3">
          {me.data && <Avatar username={me.data.username} />}
          <span className="flex-1 truncate font-medium text-heading">@{me.data?.username}</span>
        </div>
        <button
          type="button"
          onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate('/sign-in', { replace: true }) })}
          className="mt-1 flex min-h-11 w-full items-center rounded-lg px-3 text-base text-nav hover:bg-surface"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    if (!menuOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <div className="flex min-h-dvh bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
        <p className="px-6 pt-5 text-2xl font-bold text-heading">khatet</p>
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-heading/30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside
            id="mobile-sidebar"
            aria-label="Sidebar"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-2xl font-bold text-heading">khatet</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close sidebar"
                className="inline-flex size-11 items-center justify-center rounded-lg text-heading hover:bg-surface"
                autoFocus
              >
                <CloseIcon />
              </button>
            </div>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white px-4 py-2 lg:justify-end lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open sidebar"
            aria-expanded={menuOpen}
            aria-controls="mobile-sidebar"
            className="inline-flex size-11 items-center justify-center rounded-lg text-heading hover:bg-surface lg:hidden"
          >
            <MenuIcon />
          </button>
          <Link to="/projects" className="flex-1 text-xl font-bold text-heading lg:hidden">
            khatet
          </Link>
          <NotificationsButton />
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
