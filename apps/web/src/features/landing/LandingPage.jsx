import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useDocumentTitle } from '../../app/pageMeta.js'
import Logo from '../../components/Logo.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import HeroPreview from './HeroPreview.jsx'
import { useReducedMotion, useReveal } from './hooks.js'
import './landing.css'

// The public page for visitors who are not signed in (and for anyone opening khatet.vercel.app
// for the first time). Signed-in people go straight to their projects instead (HomePage.jsx).

const primaryCta =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-action px-6 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-8px_rgba(38,54,41,0.6)] transition-[background-color,transform] duration-150 hover:bg-heading active:scale-[0.98]'
const secondaryCta =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[#d5ddd3] bg-white px-6 text-[15px] font-semibold text-heading transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.98]'

const NAV = [
  ['#preview', 'Preview'],
  ['#tour', 'Guided tour'],
]

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.6 5.4v5.2L10.8 8 6.6 5.4Z" fill="currentColor" />
    </svg>
  )
}

// The خ mark at any size, drawn as a stroke so it can draw itself.
function DrawnMark({ className = '', stroke = '#263629', dot = '#C86C4D', strokeWidth = 9 }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <path
        className="landing-mark-stroke"
        pathLength="120"
        d="M14 26H40L22 40C18 44 22 52 30 52H50"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot && <circle className="landing-mark-dot" cx="27" cy="11" r="5.5" fill={dot} />}
    </svg>
  )
}

function Header() {
  const sentinelRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  // A 1px marker at the top of the page tells the header when the page has scrolled, without a scroll listener.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="absolute top-0 h-px w-px" />
      <header
        data-scrolled={scrolled ? 'true' : 'false'}
        className="landing-header sticky top-0 z-40 border-b border-transparent"
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:h-[72px] sm:px-6">
          <a href="#top" className="flex min-h-11 items-center gap-2.5 rounded-md">
            <Logo label="" size={30} />
            <span className="text-lg font-semibold tracking-[-0.01em] text-heading">Khatet</span>
            <span className="sr-only">, back to the top</span>
          </a>
          <nav aria-label="Page sections" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted hover:bg-white hover:text-heading">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/sign-in" className="inline-flex h-11 items-center rounded-[10px] px-3 text-sm font-semibold text-heading hover:bg-white sm:h-10">
              Sign in
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex h-11 items-center rounded-[10px] bg-action px-4 text-sm font-semibold text-white hover:bg-heading sm:h-10"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden pt-10 pb-16 sm:pt-12 sm:pb-24">
      <div aria-hidden="true" className="landing-paper absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 text-center sm:px-6">
        <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-[#dbe3d9] bg-white/80 py-1.5 pr-3.5 pl-2 text-sm font-medium text-heading shadow-card">
          <DrawnMark className="size-5" />
          5 clear stages, from Backlog to Done
        </p>
        <h1
          id="hero-title"
          data-reveal
          style={{ '--reveal-delay': '60ms' }}
          className="landing-display mt-6 max-w-[860px] text-[40px] leading-[1.04] font-semibold text-heading sm:text-[60px] lg:text-[64px]"
        >
          Plan together. Finish on time.
        </h1>
        <p
          data-reveal
          style={{ '--reveal-delay': '120ms' }}
          className="landing-pretty mt-5 max-w-[620px] text-[17px] leading-relaxed text-muted sm:text-xl"
        >
          Tasks, board, chat and progress in one shared place.
        </p>
        <div data-reveal style={{ '--reveal-delay': '180ms' }} className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link to="/sign-in" className={primaryCta}>
            Get started
            <ArrowRight />
          </Link>
          <Link to="/demo" className={secondaryCta}>
            <PlayIcon />
            Try the live demo
          </Link>
        </div>
        <div id="preview" data-reveal style={{ '--reveal-delay': '280ms' }} className="mt-12 w-full sm:mt-10">
          <HeroPreview />
        </div>
      </div>
    </section>
  )
}

function TourSection() {
  return (
    <section id="tour" aria-labelledby="tour-title" className="px-4 py-16 sm:px-6 sm:py-24">
      <div
        data-reveal
        className="relative mx-auto grid max-w-[1200px] items-center gap-10 overflow-hidden rounded-[28px] border border-line bg-white p-6 shadow-[0_30px_60px_-30px_rgba(20,40,25,0.25)] sm:p-10 lg:grid-cols-2 lg:p-14"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold text-action">Guided tour</p>
          <h2 id="tour-title" className="landing-display text-[30px] leading-[1.1] font-semibold text-heading sm:text-[40px]">
            See the real app in two minutes
          </h2>
          <p className="landing-pretty text-[17px] leading-relaxed text-muted">
            A short tour of a sample project. No account needed.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/demo" className={primaryCta}>
              <PlayIcon />
              Start the guided tour
            </Link>
            <Link to="/sign-in" className={secondaryCta}>
              Create an account
            </Link>
          </div>
        </div>

        {/* A picture of the tour: a highlighted card and the step card beside it. */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[460px]">
          <div className="rounded-[18px] border border-line bg-surface p-3">
            <div className="flex gap-2.5">
              {['TODO', 'IN_PROGRESS'].map((status) => (
                <div key={status} className="flex flex-1 flex-col gap-2 rounded-[12px] border border-line bg-white/70 p-2">
                  <p className="flex items-center gap-1.5 text-xs text-body">
                    <StatusIcon status={status} />
                    {status === 'TODO' ? 'To Do' : 'In Progress'}
                  </p>
                  {[false, status === 'IN_PROGRESS'].map((lit, card) => (
                    <div
                      key={card}
                      className={`flex h-14 flex-col justify-center gap-1.5 rounded-[10px] border bg-white px-2.5 ${lit ? 'border-action shadow-[0_0_0_4px_rgba(64,83,63,0.18)]' : 'border-line'}`}
                    >
                      <span className={`h-2 rounded-full ${lit ? 'w-4/5 bg-heading/70' : 'w-3/4 bg-surface-subtle'}`} />
                      <span className="h-2 w-1/2 rounded-full bg-surface-subtle" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="relative -mt-6 ml-auto w-[88%] rounded-[16px] border border-line bg-white p-4 shadow-[0_24px_48px_-16px_rgba(20,40,25,0.35)]">
            <p className="text-xs font-semibold text-action">Step 2 of 7</p>
            <p className="mt-1 text-base font-semibold text-heading">Move work across the board</p>
            <p className="mt-1 text-sm text-muted">Drag this card to Ready for Review.</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="flex gap-1">
                {Array.from({ length: 7 }, (_, index) => (
                  <span key={index} className={`h-1.5 rounded-full ${index === 1 ? 'w-4 bg-action' : 'w-1.5 bg-surface-subtle'}`} />
                ))}
              </span>
              <span className="flex gap-2">
                <span className="inline-flex h-9 items-center rounded-[9px] border border-line px-3 text-label font-medium text-heading">Back</span>
                <span className="inline-flex h-9 items-center rounded-[9px] bg-action px-3 text-label font-medium text-white">Next</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-8 border-t border-line pt-8 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-[360px] flex-col gap-3">
          <p className="flex items-center gap-2.5">
            <Logo label="" size={26} />
            <span className="text-base font-semibold text-heading">Khatet</span>
          </p>
          <p className="text-sm text-muted">
            Team projects, planned together.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <a href={href} className="inline-flex min-h-11 items-center text-muted hover:text-heading sm:min-h-9">
                  {label}
                </a>
              </li>
            ))}
            <li>
              <Link to="/demo" className="inline-flex min-h-11 items-center text-muted hover:text-heading sm:min-h-9">
                Live demo
              </Link>
            </li>
            <li>
              <Link to="/sign-in" className="inline-flex min-h-11 items-center text-muted hover:text-heading sm:min-h-9">
                Sign in
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/FahadmAlmutairi/khatet"
                className="inline-flex min-h-11 items-center text-muted hover:text-heading sm:min-h-9"
                target="_blank"
                rel="noreferrer"
              >
                Source code<span className="sr-only"> on GitHub (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mt-8 text-xs text-muted">© 2026 Khatet.</p>
    </footer>
  )
}

export default function LandingPage() {
  useDocumentTitle('Team projects, planned together')
  const reduce = useReducedMotion()
  const rootRef = useRef(null)
  useReveal(rootRef, !reduce)

  return (
    <div ref={rootRef} id="top" className={`landing relative min-h-dvh bg-surface ${reduce ? '' : 'landing-motion'}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <TourSection />
      </main>
      <Footer />
    </div>
  )
}
