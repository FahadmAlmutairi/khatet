import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router'
import { useMe, useProjects, useSignOut } from '../api/hooks.js'
import Avatar from '../components/Avatar.jsx'
import { BoardIcon, ChevronIcon, CloseIcon, HomeIcon, MembersIcon, MenuIcon, PlusIcon, SignOutIcon } from '../components/icons.jsx'
import NotificationsButton from '../features/notifications/NotificationsButton.jsx'

// Sizes and colours from the Figma "Project Sidebar" (page 08, Board 324:778).
function subNavClass({ isActive }) {
  return `flex h-11 items-center gap-2 rounded-md px-2 text-xs lg:h-[30px] ${
    isActive ? 'bg-nav-active font-medium text-[#26352a]' : 'text-nav hover:bg-surface'
  }`
}

function Sidebar({ onNavigate }) {
  const { projectId } = useParams()
  const projects = useProjects()
  const me = useMe()
  const signOut = useSignOut()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <NavLink
          to="/projects"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex h-11 items-center gap-2 rounded-md px-2 text-xs lg:h-10 ${isActive ? 'bg-nav-active font-medium text-[#26352a]' : 'text-nav hover:bg-surface'}`
          }
        >
          <HomeIcon />
          Home
        </NavLink>

        <div className="flex flex-col gap-2">
          <div className="flex h-6 items-center justify-between">
            <h2 className="text-xs font-medium tracking-[1px] text-[#879388] uppercase">Projects</h2>
            <Link
              to="/projects?new=project"
              onClick={onNavigate}
              aria-label="Create project"
              className="inline-flex size-11 items-center justify-center rounded-md text-[#879388] lg:size-6 hover:bg-surface hover:text-heading"
            >
              <PlusIcon />
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {projects.data?.map((project) => {
              const current = project.id === projectId
              return (
                <li key={project.id}>
                  <NavLink
                    to={`/projects/${project.id}/board`}
                    onClick={onNavigate}
                    aria-current={current ? 'true' : undefined}
                    className={`flex h-11 items-center gap-2 rounded-lg p-2 text-xs font-medium lg:h-10 text-[#26352a] ${
                      current ? 'bg-[#f7faf6]' : 'hover:bg-surface'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-medium ${
                        current ? 'bg-[#e5eee4] text-[#4c6650]' : 'bg-[#f1f3f0] text-[#68736b]'
                      }`}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate">{project.name}</span>
                    <span aria-hidden="true" className="text-[#78847a]">
                      <ChevronIcon direction={current ? 'up' : 'down'} size={14} />
                    </span>
                  </NavLink>
                  {current && (
                    <ul className="mt-2 flex flex-col gap-1 pl-6">
                      <li>
                        <NavLink to={`/projects/${project.id}/board`} className={subNavClass} onClick={onNavigate}>
                          <BoardIcon />
                          Board
                        </NavLink>
                      </li>
                      <li>
                        <NavLink to={`/projects/${project.id}/members`} className={subNavClass} onClick={onNavigate}>
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
        </div>
      </nav>
      <div className="flex flex-col gap-2">
        <div className="h-px bg-line" />
        <button
          type="button"
          onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate('/sign-in', { replace: true }) })}
          className="flex h-11 w-full items-center gap-2 rounded-lg px-2 lg:h-9 text-left text-xs text-nav hover:bg-surface"
        >
          <SignOutIcon />
          Sign out
        </button>
        <div className="flex h-10 items-center gap-2">
          {me.data && <Avatar username={me.data.username} />}
          <span className="truncate text-xs font-medium text-body">@{me.data?.username}</span>
        </div>
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

      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-6 border-r border-line bg-white p-4 lg:flex">
        <p className="text-[28px] leading-[34px] font-bold text-body">khatet</p>
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-heading/30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside
            id="mobile-sidebar"
            aria-label="Sidebar"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-white p-4 shadow-xl"
          >
            <div className="-my-1.5 flex items-center justify-between">
              <p className="text-[28px] leading-[34px] font-bold text-body">khatet</p>
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-[#e3e5de] bg-white px-4 lg:justify-end lg:px-8">
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
          <Link to="/projects" className="inline-flex min-h-11 flex-1 items-center text-xl font-bold text-heading lg:hidden">
            khatet
          </Link>
          <NotificationsButton />
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
