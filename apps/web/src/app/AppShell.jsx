import { Link, NavLink, Outlet } from 'react-router'

function navLinkClass({ isActive }) {
  return [
    'inline-flex min-h-11 items-center rounded-md px-3 font-medium',
    isActive ? 'bg-action text-white' : 'text-heading hover:bg-surface-subtle',
  ].join(' ')
}

export default function AppShell() {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      <header className="border-b border-surface-subtle bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link to="/projects" className="min-h-11 content-center text-xl font-bold text-heading">
            Khatet
          </Link>
          <nav aria-label="Main">
            <ul className="flex gap-1">
              <li>
                <NavLink to="/projects" className={navLinkClass}>
                  Projects
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
