import { useEffect, useRef, useState } from 'react'
import { AvatarStack } from '../../components/Avatar.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import { BellIcon, ChatIcon, HistoryIcon, MoreIcon, WarningIcon } from '../../components/icons.jsx'

// Four chapters about the daily work. On wide screens the picture on the right stays in place
// while the chapters scroll past, and changes with the chapter in the middle of the screen.
// On phones each chapter shows its own picture under the text. The pictures are decorative:
// the text says everything they show.

const people = (...names) => names.map((name) => ({ id: name, username: name }))

function Frame({ title, icon, children, className = '' }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_24px_48px_-24px_rgba(20,40,25,0.22)] ${className}`}>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4 text-label font-semibold text-heading">
        {icon}
        {title}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

function MiniCard({ title, people: names, priority, children, blocked, focus }) {
  return (
    <div
      className={`relative flex flex-col gap-2 overflow-hidden rounded-[12px] border bg-white p-3 shadow-card ${focus ? 'border-action ring-[3px] ring-action/25' : 'border-line'}`}
    >
      {blocked && <span className="absolute inset-y-0 left-0 w-[3px] bg-blocked" />}
      <p className="text-sm font-medium text-body">{title}</p>
      {children}
      <div className="flex items-center justify-between">
        {priority ? <PriorityBadge priority={priority} /> : <span />}
        <AvatarStack users={people(...names)} />
      </div>
    </div>
  )
}

function BoardVisual() {
  return (
    <Frame title="Board" icon={<StatusIcon status="IN_PROGRESS" />}>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-2.5 pt-3">
          <span className="absolute inset-x-0 top-0 h-1 rounded-t-[14px] bg-status-todo" />
          <p className="flex items-center gap-1.5 text-xs text-body">
            <StatusIcon status="TODO" /> To Do · 2
          </p>
          <div className="relative">
            <MiniCard title="Write the survey questions" people={['lina']} priority="LOW" focus>
              <span className="text-xs text-muted">Due Sunday</span>
            </MiniCard>
            <span className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md bg-surface text-heading ring-2 ring-focus">
              <MoreIcon />
            </span>
            {/* The keyboard path: the card's More actions menu, then Move to. */}
            <div className="absolute top-10 left-2 z-10 w-[188px] sm:right-0 sm:left-auto rounded-[12px] border border-line bg-white p-1.5 shadow-[0_16px_32px_rgba(20,31,23,0.16)]">
              <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-muted">Move to</p>
              {[
                ['TODO', 'To Do'],
                ['IN_PROGRESS', 'In Progress'],
                ['READY_FOR_REVIEW', 'Ready for Review'],
                ['DONE', 'Done'],
              ].map(([status, label]) => (
                <p
                  key={status}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${status === 'IN_PROGRESS' ? 'bg-nav-active font-medium text-heading' : 'text-body'}`}
                >
                  <StatusIcon status={status} />
                  {label}
                </p>
              ))}
            </div>
          </div>
          <MiniCard title="Draft the demo day slides" people={['fahad']} priority="MEDIUM" />
        </div>
        <div className="relative flex flex-col gap-2.5 rounded-[14px] border border-dashed border-action/40 bg-nav-active/50 p-2.5 pt-3">
          <span className="absolute inset-x-0 top-0 h-1 rounded-t-[14px] bg-status-in-progress" />
          <p className="flex items-center gap-1.5 text-xs text-body">
            <StatusIcon status="IN_PROGRESS" /> In Progress · 1
          </p>
          <div className="h-[92px] rounded-[12px] border-2 border-dashed border-action/30" />
          <MiniCard title="Prototype the board" people={['fahad', 'sara']} priority="MEDIUM" />
        </div>
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-[12px] text-heading">Tab</kbd>
        to the card,
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-[12px] text-heading">Enter</kbd>
        on More actions, then pick a column.
      </p>
    </Frame>
  )
}

function AttentionVisual() {
  return (
    <div className="flex flex-col gap-4">
      <Frame
        title="Needs attention · 2"
        icon={
          <span className="grid size-6 place-items-center rounded-md bg-priority-high-bg text-blocked">
            <WarningIcon />
          </span>
        }
      >
        <ul className="flex flex-col gap-2">
          <li className="flex items-center gap-3 rounded-[12px] bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-body">Book the usability lab</p>
              <p className="truncate text-xs text-muted">omar · Waiting for room approval</p>
            </div>
            <span className="rounded-full bg-priority-high-bg px-2.5 py-1 text-xs font-medium text-priority-high-text">Blocked</span>
          </li>
          <li className="flex items-center gap-3 rounded-[12px] bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-body">Wireframe the sign-in flow</p>
              <p className="truncate text-xs text-muted">sara · Due Monday</p>
            </div>
            <span className="rounded-full bg-priority-high-bg px-2.5 py-1 text-xs font-medium text-priority-high-text">Overdue</span>
          </li>
        </ul>
      </Frame>
      <div className="ml-auto w-[88%] rounded-[16px] border border-line bg-white p-4 shadow-[0_18px_36px_-18px_rgba(20,40,25,0.25)]">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-heading">
            <StatusIcon status="BLOCKED" />
            Blocked
          </p>
          <span className="relative inline-flex h-6 w-10 items-center rounded-full bg-blocked p-0.5">
            <span className="ml-auto size-5 rounded-full bg-white shadow" />
          </span>
        </div>
        <p className="mt-3 text-xs font-medium text-muted">Reason</p>
        <p className="mt-1 rounded-[9px] border border-input px-3 py-2 text-sm text-body">Waiting for room approval</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-action">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="m2.5 6.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Saved
        </p>
      </div>
    </div>
  )
}

function ChatVisual() {
  return (
    <Frame title="Project chat" icon={<ChatIcon />}>
      <div className="flex flex-col gap-3.5">
        {[
          ['sara', '9:10', 'Pushed the new sign-in screens. Can someone review them today?'],
          ['fahad', '9:14', 'Yes, after the lecture.'],
        ].map(([name, time, text]) => (
          <div key={time} className="flex gap-2.5">
            <AvatarStack users={people(name)} />
            <div>
              <p className="text-xs text-muted">
                <span className="font-semibold text-heading">{name}</span> · {time}
              </p>
              <p className="mt-0.5 text-sm text-body">{text}</p>
            </div>
          </div>
        ))}
        <div className="flex gap-2.5">
          <AvatarStack users={people('omar')} />
          <div className="min-w-0">
            <p className="text-xs text-muted">
              <span className="font-semibold text-heading">omar</span> · 9:20
            </p>
            <p className="mt-0.5 text-sm text-body">This one is ready for you:</p>
            <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-action/40 bg-nav-active px-2 py-1 text-xs font-medium text-heading">
              <StatusIcon status="READY_FOR_REVIEW" />
              <span className="truncate">Prototype the board</span>
            </span>
          </div>
        </div>
        <div className="relative mt-2">
          <div className="absolute right-0 bottom-full left-0 mb-2 rounded-[12px] border border-line bg-white p-1.5 shadow-[0_16px_32px_rgba(20,31,23,0.14)]">
            <p className="px-2 pt-1 pb-1 text-xs font-semibold text-muted">Tasks to mention</p>
            <p className="flex items-center gap-2 rounded-md bg-nav-active px-2 py-1.5 text-sm font-medium text-heading">
              <StatusIcon status="IN_PROGRESS" /> Write the survey questions
            </p>
            <p className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-body">
              <StatusIcon status="TODO" /> Draft the demo day slides
            </p>
          </div>
          <div className="flex h-11 items-center rounded-[10px] border border-action px-3 text-sm text-body ring-2 ring-action/15">
            Thanks! Next is #
            <span className="ml-px h-4 w-px bg-action" />
          </div>
        </div>
      </div>
    </Frame>
  )
}

function LogVisual() {
  const rows = [
    ['sara', 'moved', 'Prototype the board', 'to Done', '2 min ago', 'DONE'],
    ['omar', 'flagged', 'Book the usability lab', 'as Blocked', '1 h ago', 'BLOCKED'],
    ['fahad', 'gave omar', 'Edit all tasks', 'access', 'Yesterday', null],
    ['lina', 'joined the project', '', '', 'Monday', null],
  ]
  return (
    <div className="relative">
      <Frame title="Project log" icon={<HistoryIcon />}>
        <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
          {rows.map(([name, verb, object, rest, time, status]) => (
            <li key={time} className="relative flex items-start gap-3">
              <AvatarStack users={people(name)} />
              <div className="min-w-0 pt-0.5">
                <p className="text-sm text-body">
                  <span className="font-semibold text-heading">{name}</span> {verb}{' '}
                  {object && (
                    <span className="inline-flex items-center gap-1 font-medium text-heading">
                      {status && <StatusIcon status={status} />}
                      {object}
                    </span>
                  )}{' '}
                  {rest}
                </p>
                <p className="text-xs text-muted">{time}</p>
              </div>
            </li>
          ))}
        </ol>
      </Frame>
      <div className="relative -mt-3 mr-3 ml-auto w-[250px] max-w-[calc(100%-24px)] rounded-[16px] border border-line bg-white p-3.5 shadow-[0_18px_36px_-12px_rgba(20,40,25,0.3)] sm:absolute sm:-right-4 sm:-bottom-10 sm:m-0">
        <p className="flex items-center gap-2 text-xs font-semibold text-heading">
          <span className="relative">
            <BellIcon />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-attention" />
          </span>
          Notifications
        </p>
        <p className="mt-2 text-sm text-body">
          <span className="font-semibold">fahad</span> assigned you <span className="font-medium">Write the survey questions</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">Just now</p>
      </div>
    </div>
  )
}

const CHAPTERS = [
  {
    id: 'board',
    eyebrow: 'Board',
    title: 'A board the whole team reads the same way',
    body: 'Tasks move through five clear stages, from Backlog to Done. Drag a card with a mouse or a long press, or open its More actions menu and choose Move to from the keyboard.',
    points: ['Every status shows its name and a shape, never colour alone', 'Several assignees, a priority and a due date on each task'],
    visual: <BoardVisual />,
  },
  {
    id: 'attention',
    eyebrow: 'Overview',
    title: 'Problems come to you',
    body: 'Mark a task Blocked and write down why. Blocked and overdue tasks gather under Needs attention on the Overview, so the team can help before the deadline instead of after it.',
    points: ['Blocked is a flag on the card, so the task keeps its place', 'Upcoming work for the whole team or just for you'],
    visual: <AttentionVisual />,
  },
  {
    id: 'chat',
    eyebrow: 'Project chat',
    title: 'Talk right next to the work',
    body: 'Every project has its own chat, open to every member. Type # to mention a task, and anyone can open that task straight from the message.',
    points: ['Messages arrive live while the chat is open', 'Opens beside the board on a laptop and full screen on a phone'],
    visual: <ChatVisual />,
  },
  {
    id: 'log',
    eyebrow: 'Project log and notifications',
    title: 'A record nobody has to keep',
    body: 'The project log writes down who changed what and when, for every member to read. Notifications tell you when you are assigned a task or invited to a project.',
    points: ['Filter the log by person or by kind of change', 'The log stays readable even after a project is archived'],
    visual: <LogVisual />,
  },
]

export default function FeatureStory() {
  const [active, setActive] = useState(0)
  const chapterRefs = useRef([])

  // The chapter crossing the middle of the screen chooses the picture.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number(entry.target.dataset.index))
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    chapterRefs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
      <ol className="flex flex-col gap-16 lg:gap-0">
        {CHAPTERS.map((chapter, index) => (
          <li
            key={chapter.id}
            ref={(node) => {
              chapterRefs.current[index] = node
            }}
            data-index={index}
            className="flex flex-col justify-center gap-6 lg:min-h-[72vh]"
          >
            {/* On wide screens a rail on the left marks the chapter that matches the picture. Text keeps full contrast. */}
            <div
              className={`story-step flex flex-col gap-4 lg:border-l-2 lg:pl-6 ${active === index ? 'lg:border-action' : 'lg:border-line'}`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-action">
                <span
                  aria-hidden="true"
                  className="inline-flex size-6 items-center justify-center rounded-full bg-nav-active text-xs tabular-nums text-heading"
                >
                  {index + 1}
                </span>
                {chapter.eyebrow}
              </p>
              <h3 className="landing-balance text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-heading sm:text-[30px]">
                {chapter.title}
              </h3>
              <p className="landing-pretty max-w-[520px] text-base leading-relaxed text-muted sm:text-[17px]">{chapter.body}</p>
              <ul className="flex flex-col gap-2">
                {chapter.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[15px] text-body">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
                      <circle cx="9" cy="9" r="9" fill="var(--color-nav-active)" />
                      <path d="m5.5 9.2 2.3 2.3 4.7-5" stroke="var(--color-action)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div aria-hidden="true" className="lg:hidden">
              {chapter.visual}
            </div>
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="hidden lg:block">
        <div className="sticky top-[max(96px,calc(50vh-280px))] h-[560px]">
          {CHAPTERS.map((chapter, index) => (
            <div key={chapter.id} data-active={active === index ? 'true' : 'false'} className="story-visual absolute inset-0 flex items-center">
              <div className="w-full">{chapter.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
