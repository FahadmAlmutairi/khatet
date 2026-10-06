import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { useMe, useProjects, useSignOut } from '../api/hooks.js'
import Avatar from '../components/Avatar.jsx'
import Breadcrumb from '../components/Breadcrumb.jsx'
import { BoardIcon, ChevronIcon, CloseIcon, HomeIcon, MembersIcon, MenuIcon, PanelLeftIcon, PlusIcon, SignOutIcon } from '../components/icons.jsx'
import Logo from '../components/Logo.jsx'
import NotificationsButton from '../features/notifications/NotificationsButton.jsx'
import { EASE } from '../lib/motion.js'
import { useBreadcrumb } from './pageMeta.js'

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
            <h2 className="text-xs font-medium tracking-[1px] text-muted uppercase">Projects</h2>
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

// A label that appears beside a rail control on hover or keyboard focus.
function RailTip({ children }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-md bg-heading px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  )
}

const railItem = 'group relative inline-flex size-10 cursor-pointer items-center justify-center rounded-lg text-nav hover:bg-surface hover:text-heading'

// Collapsed desktop sidebar (like ChatGPT): the logo, Home, one tile per project and the user.
// Hovering the logo turns it into the open button; clicking any empty part of the rail opens it too.
function Rail({ onExpand, expandButtonRef }) {
  const { projectId } = useParams()
  const projects = useProjects()
  const me = useMe()

  return (
    <aside
      aria-label="Sidebar"
      onClick={(event) => {
        if (!event.target.closest('a, button')) onExpand()
      }}
      className="sidebar-enter sticky top-0 z-30 hidden h-dvh w-16 shrink-0 cursor-e-resize flex-col items-center gap-4 border-r border-line bg-white py-3 lg:flex"
    >
      <button
        type="button"
        ref={expandButtonRef}
        onClick={onExpand}
        aria-label="Expand sidebar"
        aria-keyshortcuts={'Control+\\ Meta+\\'}
        className={railItem.replace('cursor-pointer', 'cursor-e-resize')}
      >
        <span className="inline-flex group-hover:hidden group-focus-visible:hidden">
          <Logo label="" size={28} />
        </span>
        <span className="hidden group-hover:inline-flex group-focus-visible:inline-flex">
          <PanelLeftIcon />
        </span>
        <RailTip>Open sidebar</RailTip>
      </button>
      <nav aria-label="Main" className="flex flex-col items-center gap-2">
        <NavLink to="/projects" end aria-label="Home" className={({ isActive }) => `${railItem} ${isActive ? 'bg-nav-active text-heading' : ''}`}>
          <HomeIcon />
          <RailTip>Home</RailTip>
        </NavLink>
        {projects.data?.map((project) => {
          const current = project.id === projectId
          return (
            <Link
              key={project.id}
              to={`/projects/${project.id}/board`}
              aria-label={project.name}
              aria-current={current ? 'true' : undefined}
              className={railItem}
            >
              <span
                aria-hidden="true"
                className={`inline-flex size-7 items-center justify-center rounded-md text-xs font-medium ${
                  current ? 'bg-[#e5eee4] text-[#4c6650] ring-2 ring-action/40' : 'bg-[#f1f3f0] text-[#68736b]'
                }`}
              >
                {project.name.charAt(0).toUpperCase()}
              </span>
              <RailTip>{project.name}</RailTip>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto">{me.data && <Avatar username={me.data.username} />}</div>
    </aside>
  )
}

const COLLAPSED_KEY = 'khatet.sidebarCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

const SIDEBAR_WIDTH = 232
const RAIL_WIDTH = 64

const panelButton = 'inline-flex size-8 items-center justify-center rounded-md text-nav hover:bg-surface hover:text-heading'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Desktop: the sidebar can be hidden to give the board more room; the choice is remembered.
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const hideButtonRef = useRef(null)
  const showButtonRef = useRef(null)
  const toggledRef = useRef(false)
  const contentRef = useRef(null)
  const firstRenderRef = useRef(true)

  // The page column jumps to its new width once, then slides from where it was to where it is
  // (FLIP). Only transform animates, so the browser does no layout work during the motion.
  useLayoutEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    const content = contentRef.current
    if (!content?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia?.('(min-width: 64rem)').matches) return
    const shift = SIDEBAR_WIDTH - RAIL_WIDTH
    content.animate([{ transform: `translateX(${collapsed ? shift : -shift}px)` }, { transform: 'translateX(0)' }], {
      duration: 280,
      easing: EASE,
    })
  }, [collapsed])

  // The pressed button disappears, so focus moves to the button that replaces it.
  useEffect(() => {
    if (!toggledRef.current) return
    toggledRef.current = false
    // Only when focus was lost with the hidden part; never pull it out of a field the user is typing in.
    if (document.activeElement && document.activeElement !== document.body) return
    ;(collapsed ? showButtonRef : hideButtonRef).current?.focus()
  }, [collapsed])

  function toggleSidebar() {
    toggledRef.current = true
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, String(!value))
      } catch {
        // Private windows can block storage; the toggle still works for this visit.
      }
      return !value
    })
  }

  useEffect(() => {
    // Ctrl+\ (Cmd+\ on a Mac) shows or hides the sidebar, as in many editors.
    function onKeyDown(event) {
      if (event.key === '\\' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
  const crumbs = useBreadcrumb()
  const pageKey = useLocation().pathname
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

      {collapsed && <Rail onExpand={toggleSidebar} expandButtonRef={showButtonRef} />}
      {!collapsed && (
        <aside className="sidebar-enter sticky top-0 z-30 hidden h-dvh w-[232px] shrink-0 flex-col gap-6 border-r border-line bg-white p-4 lg:flex">
          <div className="flex items-center justify-between">
            <Link to="/projects" className="inline-flex size-8 items-center justify-center">
              <Logo label="Khatet home" />
            </Link>
            <button
              type="button"
              ref={hideButtonRef}
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              aria-keyshortcuts={'Control+\\ Meta+\\'}
              className={`group relative cursor-w-resize ${panelButton}`}
            >
              <PanelLeftIcon />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-full right-0 z-50 mt-2 rounded-md bg-heading px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                Close sidebar
              </span>
            </button>
          </div>
          <Sidebar />
        </aside>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-heading/30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside
            id="mobile-sidebar"
            aria-label="Sidebar"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-white p-4 shadow-xl"
          >
            <div className="-my-1.5 flex items-center justify-between">
              <Logo />
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

      <div ref={contentRef} className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-[#e3e5de] bg-white px-4 lg:px-8">
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
          <span className="flex flex-1 lg:hidden">
            <Link to="/projects" className="inline-flex size-11 items-center justify-center">
              <Logo label="Khatet home" />
            </Link>
          </span>
          <Breadcrumb items={crumbs} className="hidden flex-1 lg:block" />
          <NotificationsButton />
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 lg:p-8">
          {/* A new page settles in with a short fade; opening a task keeps the page still. */}
          <div key={pageKey} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
