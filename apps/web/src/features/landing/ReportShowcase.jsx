import { useEffect, useRef, useState } from 'react'
import { SparkleIcon, SummaryIcon, WarningIcon } from '../../components/icons.jsx'
import { useReducedMotion } from './hooks.js'

// A sample AI report the visitor can generate again. Under it, the project before and after the
// report: the same numbers, to show that the report only reads the project.

const SNAPSHOT = [
  ['Tasks', '7'],
  ['Assignees', '4'],
  ['Due dates', '5'],
  ['Access levels', '4'],
]

function Section({ icon, title, tone = 'text-heading', children, delay }) {
  return (
    <div className="report-line flex flex-col gap-2" style={{ '--delay': `${delay}ms` }}>
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function ReportShowcase() {
  const reduce = useReducedMotion()
  const [state, setState] = useState('ready')
  const [runs, setRuns] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function generate() {
    setState('generating')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => {
        setState('ready')
        setRuns((value) => value + 1)
      },
      reduce ? 300 : 1400,
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[22px] bg-white p-5 text-body shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-[10px] bg-[#f8e6de] text-attention">
              <SparkleIcon />
            </span>
            <div>
              <p className="text-base font-semibold text-heading">Project report</p>
              <p className="text-xs text-muted">{state === 'generating' ? 'Reading the project…' : 'Sample · generated just now by fahad'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={state === 'generating'}
            className="inline-flex min-h-11 items-center gap-2 rounded-control bg-action px-4 text-label font-medium text-white hover:bg-heading disabled:opacity-60 sm:min-h-10"
          >
            <SparkleIcon />
            {state === 'generating' ? 'Generating…' : 'Generate again'}
          </button>
        </div>

        <div className="mt-5 min-h-[300px]">
          {state === 'generating' ? (
            <div className="flex flex-col gap-3" aria-hidden="true">
              {[92, 78, 60, 85, 70].map((width, index) => (
                <span key={index} className="report-shimmer block h-3.5 rounded-full bg-surface-subtle/70" style={{ width: `${width}%` }} />
              ))}
            </div>
          ) : (
            <div key={runs} className="flex flex-col gap-5">
              <Section icon={<SummaryIcon />} title="Progress summary" delay={0}>
                <p className="text-sm leading-relaxed">
                  3 of 7 tasks are done. The board prototype was finished today, and the survey is on track for Sunday.
                </p>
              </Section>
              <Section icon={<WarningIcon />} title="Warnings" tone="text-priority-high-text" delay={140}>
                <ul className="flex flex-col gap-1.5 text-sm leading-relaxed">
                  <li className="rounded-[10px] bg-priority-high-bg/50 px-3 py-2">
                    <strong className="font-semibold">Book the usability lab</strong> has been blocked for two days.
                  </li>
                  <li className="rounded-[10px] bg-priority-high-bg/50 px-3 py-2">
                    <strong className="font-semibold">omar</strong> holds three of the four open high priority tasks.
                  </li>
                </ul>
              </Section>
              <Section
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 13h4M6.5 15h3M8 1.5a4.5 4.5 0 0 0-2.6 8.2c.4.3.6.7.6 1.2V11h4v-.1c0-.5.2-.9.6-1.2A4.5 4.5 0 0 0 8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                }
                title="Suggestions"
                delay={280}
              >
                <ul className="flex flex-col gap-1.5 text-sm leading-relaxed">
                  <li className="rounded-[10px] bg-surface px-3 py-2">lina offered to help with the lab booking in chat. Consider adding lina to the task.</li>
                  <li className="rounded-[10px] bg-surface px-3 py-2">Move one of omar’s tasks to sara, who has the lightest week.</li>
                </ul>
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* The proof: the project is the same before and after. */}
      <div className="rounded-[18px] border border-white/15 bg-[#323f35] p-4 text-[#e6ece3]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">Project data after the report</p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#dbe8d3] px-2.5 py-1 text-xs font-semibold text-heading">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="m2.5 6.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            0 changes
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SNAPSHOT.map(([label, value]) => (
            <div key={label} className="rounded-[12px] bg-white/[0.06] px-3 py-2">
              <dt className="text-xs text-[#c9d4c4]">{label}</dt>
              <dd className="text-lg font-semibold text-white tabular-nums">
                {value} <span className="text-xs font-medium text-[#c9d4c4]">unchanged</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p role="status" className="sr-only">
        {state === 'generating' ? 'Generating a sample report.' : runs > 0 ? 'Sample report ready. Nothing in the project changed.' : ''}
      </p>
    </div>
  )
}
