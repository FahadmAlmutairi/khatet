import { setTourStep, useLeaveDemo } from './demo.js'

const action =
  'inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-semibold text-white hover:bg-white/10 sm:min-h-9'

// A strip above the page while the live demo is open: what it is, and the ways out of it.
export default function DemoBanner() {
  const leaveDemo = useLeaveDemo()
  return (
    <section aria-label="Live demo" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-heading px-4 py-1.5 text-white lg:px-8">
      <p className="flex min-w-0 grow basis-full items-center gap-2 text-sm text-[#dbe4d7] sm:basis-0">
        <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">Live demo</span>
        <span className="truncate">Sample project. Changes are not saved.</span>
      </p>
      <div className="-mx-2.5 flex flex-wrap items-center gap-1 sm:mx-0">
        <button type="button" id="demo-restart-tour" onClick={() => setTourStep(0)} className={action}>
          Restart tour
        </button>
        <button type="button" onClick={() => leaveDemo('/sign-in')} className={action}>
          Create an account
        </button>
        <button type="button" onClick={() => leaveDemo('/')} className={`${action} text-[#dbe4d7]`}>
          Leave demo
        </button>
      </div>
    </section>
  )
}
