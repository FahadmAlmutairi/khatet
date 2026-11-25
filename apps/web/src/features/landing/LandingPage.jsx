import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useDocumentTitle } from '../../app/pageMeta.js'
import { AvatarStack } from '../../components/Avatar.jsx'
import Logo from '../../components/Logo.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import StatusPill from '../../components/StatusPill.jsx'
import AccessShowcase from './AccessShowcase.jsx'
import ChatToPlan from './ChatToPlan.jsx'
import FeatureStory from './FeatureStory.jsx'
import HeroPreview from './HeroPreview.jsx'
import ReportShowcase from './ReportShowcase.jsx'
import { useReducedMotion, useReveal } from './hooks.js'
import './landing.css'

// The public page for visitors who are not signed in (and for anyone opening khatet.vercel.app
// for the first time). Signed-in people go straight to their projects instead (HomePage.jsx).

const primaryCta =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-action px-6 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_20px_-8px_rgba(38,54,41,0.6)] transition-[background-color,transform] duration-150 hover:bg-heading active:scale-[0.98]'
const secondaryCta =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[#d5ddd3] bg-white px-6 text-[15px] font-semibold text-heading transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.98]'

const NAV = [
  ['#features', 'Features'],
  ['#ai-report', 'AI report'],
  ['#accessibility', 'Accessibility'],
  ['#tour', 'Tour'],
]

const TEAM = ['Fahad', 'Abdulaziz', 'Mohammed', 'Salman', 'Hamzah', 'Saud']

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

function SectionHeader({ eyebrow, title, children, align = 'center', tone = 'light', id }) {
  const centered = align === 'center'
  return (
    <div data-reveal className={`flex flex-col gap-4 ${centered ? 'mx-auto items-center text-center' : ''} max-w-[720px]`}>
      <p className={`text-sm font-semibold tracking-[0.02em] ${tone === 'dark' ? 'text-[#f2b49b]' : 'text-action'}`}>{eyebrow}</p>
      <h2
        id={id}
        className={`landing-display text-[32px] leading-[1.08] font-semibold sm:text-[44px] ${tone === 'dark' ? 'text-white' : 'text-heading'}`}
      >
        {title}
      </h2>
      {children && (
        <p className={`landing-pretty text-[17px] leading-relaxed sm:text-lg ${tone === 'dark' ? 'text-[#d3dccf]' : 'text-muted'}`}>{children}</p>
      )}
    </div>
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
          <a href="#top" className="flex items-center gap-2.5 rounded-md">
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
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div aria-hidden="true" className="landing-paper absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 text-center sm:px-6">
        <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-[#dbe3d9] bg-white/80 py-1.5 pr-3.5 pl-2 text-sm font-medium text-heading shadow-card">
          <DrawnMark className="size-5" />
          Built for student project teams
        </p>
        <h1
          id="hero-title"
          data-reveal
          style={{ '--reveal-delay': '60ms' }}
          className="landing-display mt-6 max-w-[860px] text-[40px] leading-[1.04] font-semibold text-heading sm:text-[60px] lg:text-[68px]"
        >
          One calm plan for your whole team.
        </h1>
        <p
          data-reveal
          style={{ '--reveal-delay': '120ms' }}
          className="landing-pretty mt-5 max-w-[620px] text-[17px] leading-relaxed text-muted sm:text-xl"
        >
          Khatet keeps your tasks, board, chat and progress in one shared place, so everyone knows what to do next
          and what needs attention before the deadline.
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
        <p data-reveal style={{ '--reveal-delay': '220ms' }} className="mt-4 text-sm text-muted">
          Free for student teams. Sign in with an email code, no password to remember.
        </p>
        <div data-reveal style={{ '--reveal-delay': '280ms' }} className="mt-12 w-full sm:mt-16">
          <HeroPreview />
        </div>
      </div>
    </section>
  )
}

function Facts() {
  const facts = [
    ['5', 'clear stages', 'from Backlog to Done'],
    ['3', 'access levels', 'for every teammate'],
    ['1', 'keyboard path', 'for every drag'],
    ['0', 'changes', 'made by the AI report'],
  ]
  return (
    <section aria-label="Khatet in numbers" className="border-y border-line bg-white">
      <dl className="mx-auto grid max-w-[1200px] grid-cols-2 gap-px bg-line px-0 sm:grid-cols-4">
        {facts.map(([value, label, detail], index) => (
          <div key={label} data-reveal style={{ '--reveal-delay': `${index * 60}ms` }} className="flex flex-col gap-1 bg-white px-5 py-7 sm:px-8">
            <dt className="order-2 text-sm text-muted">
              <span className="font-semibold text-heading">{label}</span> {detail}
            </dt>
            <dd className="landing-display order-1 text-[40px] leading-none font-semibold text-heading tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function AiSection() {
  const points = [
    'A summary of the progress since the last report',
    'Warnings about unrealistic deadlines, overloaded members and long-blocked work',
    'Suggestions the team can choose to act on',
    'No Accept or Apply buttons: tasks, dates, people and access stay as they are',
  ]
  return (
    <section id="ai-report" aria-labelledby="ai-title" className="relative isolate overflow-hidden bg-heading py-20 text-white sm:py-28">
      <DrawnMark
        className="pointer-events-none absolute -right-40 -bottom-40 -z-10 w-[640px] opacity-[0.08]"
        stroke="#AEB79D"
        dot={null}
        strokeWidth={5}
      />
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <SectionHeader id="ai-title" eyebrow="AI project report" title="Reads everything. Changes nothing." align="left" tone="dark">
            The project owner asks for a report and gets a plain-language view of the project. It is advice for the team,
            and it never edits a single task.
          </SectionHeader>
          <ul data-reveal className="flex flex-col gap-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#e6ece3]">
                <span aria-hidden="true" className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-white/10">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="m2.5 6.2 2.3 2.3 4.7-5" stroke="#dbe8d3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal style={{ '--reveal-delay': '120ms' }}>
          <ReportShowcase />
        </div>
      </div>
    </section>
  )
}

function AccessSection() {
  return (
    <section aria-labelledby="access-title" className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div data-reveal className="order-2 lg:order-1">
          <AccessShowcase />
        </div>
        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <SectionHeader id="access-title" eyebrow="Members and access" title="The right access for every teammate" align="left">
            Invite classmates by their username. They accept from their notifications, and the project owner decides what
            each person can do. Try it on omar.
          </SectionHeader>
          <ul data-reveal className="flex flex-col gap-2.5 text-[15px] text-body">
            {[
              'Only the owner manages members, access and project settings',
              'Every member can read the whole project and use chat',
              'Archive a finished project and keep its log, or restore it later',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-action" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function AccessibilitySection() {
  const statuses = [
    ['BACKLOG', 'Backlog'],
    ['TODO', 'To Do'],
    ['IN_PROGRESS', 'In Progress'],
    ['READY_FOR_REVIEW', 'Ready for Review'],
    ['DONE', 'Done'],
    ['BLOCKED', 'Blocked'],
  ]
  return (
    <section id="accessibility" aria-labelledby="a11y-title" className="bg-white py-20 sm:py-28">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 sm:px-6">
        <SectionHeader id="a11y-title" eyebrow="Accessibility" title="Made for every teammate">
          A project tool only works if the whole team can use it. Khatet is built to the WCAG 2.2 AA guidelines.
        </SectionHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <article data-reveal className="flex flex-col gap-5 rounded-[22px] border border-line bg-surface p-6 sm:p-7">
            <div>
              <h3 className="text-xl font-semibold text-heading">Status in words and shapes</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Every status has a name and its own shape, so In Progress and Done never depend on telling teal from green.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {statuses.map(([status, label]) => (
                <li key={status} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm text-body">
                  <span className="scale-125">
                    <StatusIcon status={status} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </article>
          <article data-reveal style={{ '--reveal-delay': '80ms' }} className="flex flex-col gap-5 rounded-[22px] border border-line bg-surface p-6 sm:p-7">
            <div>
              <h3 className="text-xl font-semibold text-heading">A keyboard path for every drag</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Anything you can drag, you can also do from the keyboard, with a visible focus ring on every control.
              </p>
            </div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {['Tab', 'Enter', 'Move to', 'In Progress'].map((key, index) => (
                <span key={key} className="inline-flex items-center gap-2">
                  {index > 0 && <ArrowRight />}
                  <kbd className="inline-flex h-9 items-center rounded-[9px] border border-b-2 border-line bg-white px-3 font-sans text-sm font-medium text-heading">
                    {key}
                  </kbd>
                </span>
              ))}
            </p>
          </article>
          <article data-reveal className="flex flex-col gap-2 rounded-[22px] border border-line bg-surface p-6 sm:p-7">
            <h3 className="text-xl font-semibold text-heading">Calm motion</h3>
            <p className="text-[15px] leading-relaxed text-muted">
              Movement is short and only explains a change. When your device asks for reduced motion, Khatet keeps still,
              this page included.
            </p>
          </article>
          <article data-reveal style={{ '--reveal-delay': '80ms' }} className="flex flex-col gap-2 rounded-[22px] border border-line bg-surface p-6 sm:p-7">
            <h3 className="text-xl font-semibold text-heading">Readable on any screen</h3>
            <p className="text-[15px] leading-relaxed text-muted">
              Text contrast of at least 4.5 to 1, touch targets of 44 pixels on phones, and no sideways scrolling on a screen
              360 pixels wide.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['Sign in with your email', 'Type your email, enter the 6-digit code we send, and choose a username. There is no password to forget.'],
    ['Create a project and invite your team', 'Name the project, invite classmates by username and give each person the right access.'],
    ['Plan, move and report', 'Add tasks, move them across the board, talk in chat and ask for an AI report when you need a check-in.'],
  ]
  return (
    <section aria-labelledby="how-title" className="py-20 sm:py-28">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 sm:px-6">
        <SectionHeader id="how-title" eyebrow="How it works" title="Up and running in three steps" />
        <div className="relative">
          {/* The line that joins the steps draws itself once, like a plan being sketched. */}
          <span
            data-reveal
            aria-hidden="true"
            className="steps-line pointer-events-none absolute top-7 right-[16.66%] left-[16.66%] hidden h-0.5 rounded-full bg-surface-supporting md:block"
          />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map(([title, body], index) => (
              <li key={title} data-reveal style={{ '--reveal-delay': `${index * 120}ms` }} className="flex flex-col items-center gap-4 text-center">
                <span className="grid size-14 place-items-center rounded-full border border-line bg-white text-xl font-semibold text-heading shadow-card tabular-nums">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold text-heading">{title}</h3>
                <p className="landing-pretty max-w-[320px] text-[15px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function TourSection() {
  return (
    <section id="tour" aria-labelledby="tour-title" className="px-4 pb-20 sm:px-6 sm:pb-28">
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
            Open a sample project and follow a short tour of the real screens: the overview, the board, chat, the AI report
            and members. You need no account, and nothing you change is saved.
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
            <p className="mt-1 text-base font-semibold text-heading">One board for the whole team</p>
            <p className="mt-1 text-sm text-muted">Drag a card to a new column, or open its More actions menu and choose Move to.</p>
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

function TeamSection() {
  return (
    <section aria-labelledby="team-title" className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <SectionHeader id="team-title" eyebrow="Who made it" title="Made by students, for students" align="left">
            Khatet is the SWE 444 Software Construction Laboratory project of a team of six software engineering students.
            We planned it in Scrum sprints and built it for teams like ours.
          </SectionHeader>
        </div>
        {/* The team, shown as a Khatet task. */}
        <div data-reveal style={{ '--reveal-delay': '100ms' }} className="mx-auto w-full max-w-[460px]">
          <div className="relative overflow-hidden rounded-[18px] border border-line bg-white p-5 shadow-[0_24px_48px_-24px_rgba(20,40,25,0.3)]">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-status-done" />
            <div className="flex items-start justify-between gap-4">
              <p className="text-lg font-semibold text-heading">Ship Khatet for demo day</p>
              <StatusPill status="DONE" />
            </div>
            <p className="mt-1 text-sm text-muted">SWE 444 · Software Construction Laboratory</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <PriorityBadge priority="HIGH" />
              <AvatarStack users={TEAM.map((name) => ({ id: name, username: name }))} max={6} />
            </div>
            <p className="mt-4 border-t border-line pt-3 text-sm text-body">{TEAM.join(', ')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="px-4 pb-6 sm:px-6">
      <div
        data-reveal
        className="relative isolate mx-auto flex max-w-[1200px] flex-col items-center gap-6 overflow-hidden rounded-[28px] bg-heading px-6 py-16 text-center sm:py-20"
      >
        <DrawnMark
          className="pointer-events-none absolute top-1/2 -right-24 -z-10 hidden w-[520px] -translate-y-[40%] opacity-[0.09] md:block"
          stroke="#AEB79D"
          strokeWidth={5}
          dot={null}
        />
        <h2 id="final-title" className="landing-display max-w-[640px] text-[34px] leading-[1.08] font-semibold text-white sm:text-[48px]">
          Ready when your team is.
        </h2>
        <p className="landing-pretty max-w-[520px] text-[17px] leading-relaxed text-[#d3dccf]">
          Create an account with your email and start your first project in a minute.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            to="/sign-in"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-white px-6 text-[15px] font-semibold text-heading transition-[background-color,transform] duration-150 hover:bg-surface-subtle active:scale-[0.98]"
          >
            Get started
            <ArrowRight />
          </Link>
          <Link
            to="/demo"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-white/30 px-6 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-white/10 active:scale-[0.98]"
          >
            <PlayIcon />
            Try the live demo
          </Link>
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
            Team projects, planned together. The <span lang="ar">خ</span> in our mark is the first letter of Khatet in Arabic.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm sm:grid-cols-3">
            {[
              ['#features', 'Features'],
              ['#ai-report', 'AI report'],
              ['#accessibility', 'Accessibility'],
            ].map(([href, label]) => (
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
      <p className="mt-8 text-xs text-muted">© 2026 Khatet. A SWE 444 team project.</p>
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
        <Facts />
        <section id="why" aria-labelledby="why-title" className="py-20 sm:py-28">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 sm:px-6">
            <SectionHeader id="why-title" eyebrow="Why Khatet" title="Take the plan out of the group chat">
              In a group chat the plan is spread over hundreds of messages. In Khatet each piece of work becomes a task with
              an owner, a status and a due date, so the answer is one look away.
            </SectionHeader>
            <div data-reveal>
              <ChatToPlan />
            </div>
          </div>
        </section>
        <section id="features" aria-labelledby="features-title" className="bg-white py-20 sm:py-28">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:px-6 lg:gap-4">
            <SectionHeader id="features-title" eyebrow="Everyday work" title="Everything your team needs to see, in one place" />
            <FeatureStory />
          </div>
        </section>
        <AiSection />
        <AccessSection />
        <AccessibilitySection />
        <HowItWorks />
        <TourSection />
        <TeamSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
