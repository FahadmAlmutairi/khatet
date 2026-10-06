// G8: grey shapes that match the page while it loads, so nothing jumps when the data arrives.
// The shapes are hidden from screen readers; the label is read out instead.

function Bar({ className = '' }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-line ${className}`} />
}

function Loading({ label, className = '', children }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  )
}

function CardShape() {
  return (
    <span aria-hidden="true" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-white p-3">
      <Bar className="h-3.5 w-4/5" />
      <Bar className="h-3 w-1/3" />
      <span className="flex items-center justify-between">
        <Bar className="h-5 w-14 rounded-full" />
        <Bar className="size-7 rounded-full" />
      </span>
    </span>
  )
}

export function BoardSkeleton({ label = 'Loading the board' }) {
  return (
    <Loading label={label} className="flex flex-col gap-6">
      <span aria-hidden="true" className="flex gap-4 overflow-hidden">
        {[3, 2, 1, 2].map((cards, index) => (
          <span
            key={index}
            className={`flex min-h-40 w-full shrink-0 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 sm:w-[274px] lg:w-auto lg:min-w-0 lg:flex-1 ${
              index > 0 ? 'max-sm:hidden' : ''
            }`}
          >
            <Bar className="h-4 w-24" />
            {Array.from({ length: cards }, (_, card) => (
              <CardShape key={card} />
            ))}
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="flex h-[74px] items-center rounded-[var(--radius-card)] border border-line bg-surface p-3">
        <Bar className="h-4 w-28" />
      </span>
    </Loading>
  )
}

export function ProjectCardsSkeleton({ label = 'Loading your projects' }) {
  return (
    <Loading label={label} className="flex flex-wrap gap-4">
      {[0, 1, 2].map((index) => (
        <span key={index} aria-hidden="true" className="flex w-full flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:w-[360px]">
          <span className="flex items-start gap-3">
            <Bar className="size-9 shrink-0 rounded-[10px]" />
            <span className="flex flex-1 flex-col gap-2">
              <Bar className="h-4 w-1/2" />
              <Bar className="h-3 w-4/5" />
            </span>
          </span>
          <Bar className="h-3 w-20" />
        </span>
      ))}
    </Loading>
  )
}

export function MemberRowsSkeleton({ label = 'Loading members', rows = 4 }) {
  return (
    <Loading label={label} className="mt-6 flex flex-col gap-2.5 lg:gap-0 lg:overflow-hidden lg:rounded-[14px] lg:border lg:border-line lg:bg-white">
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="flex min-h-16 items-center gap-3 rounded-[14px] border border-line bg-white px-[14px] lg:h-[78px] lg:rounded-none lg:border-0 lg:border-b lg:px-5"
        >
          <Bar className="size-10 shrink-0 rounded-full" />
          <span className="flex flex-1 flex-col gap-2">
            <Bar className="h-3.5 w-28" />
            <Bar className="h-3 w-40 lg:hidden" />
          </span>
        </span>
      ))}
    </Loading>
  )
}

export function PageSkeleton({ label }) {
  return (
    <Loading label={label} className="flex flex-col gap-6">
      <span aria-hidden="true" className="flex flex-col gap-3">
        <Bar className="h-8 w-56" />
        <Bar className="h-4 w-80 max-w-full" />
      </span>
      <BoardSkeletonShapes />
    </Loading>
  )
}

function BoardSkeletonShapes() {
  return (
    <span aria-hidden="true" className="flex gap-4 overflow-hidden">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={`flex h-56 w-full shrink-0 rounded-[var(--radius-card)] border border-line bg-surface sm:w-[274px] lg:w-auto lg:flex-1 ${
            index > 0 ? 'max-sm:hidden' : ''
          }`}
        />
      ))}
    </span>
  )
}
