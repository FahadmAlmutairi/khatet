import { PRIORITIES, STATUSES, priorityLabel, statusLabel } from '../../lib/domain.js'

function FilterMenu({ label, options, selected, onToggle }) {
  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-line bg-white px-3 text-label font-medium text-heading hover:bg-surface [&::-webkit-details-marker]:hidden">
        {label}
        {selected.size > 0 && (
          <span className="inline-flex min-w-5 justify-center rounded-full bg-nav-active px-1 text-xs" aria-label={`${selected.size} selected`}>
            {selected.size}
          </span>
        )}
        <span aria-hidden="true">⌄</span>
      </summary>
      <fieldset className="absolute z-30 mt-1.5 min-w-52 rounded-xl border border-line bg-white p-2 shadow-[0_12px_24px_rgba(38,54,41,0.16)]">
        <legend className="sr-only">Filter by {label.toLowerCase()}</legend>
        <ul className="flex flex-col gap-1">
          {options.map((option) => {
            const checked = selected.has(option.value)
            return (
              <li key={option.value}>
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-body hover:bg-surface">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(option.value)}
                    className="size-4 accent-action"
                  />
                  {option.label}
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
    </details>
  )
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-nav-active py-1 pr-1 pl-3 text-sm text-heading">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-white focus:bg-white"
      >
        <span aria-hidden="true">×</span>
      </button>
    </span>
  )
}

export default function FilterBar({ members, currentUserId, filters, onToggle, onClear }) {
  const assigneeOptions = members
    .map((member) => ({ value: member.userId, label: member.userId === currentUserId ? 'Me' : member.username }))
    .sort((a, b) => {
      if (a.value === currentUserId) return -1
      if (b.value === currentUserId) return 1
      return a.label.localeCompare(b.label)
    })
  const assigneeNames = new Map(assigneeOptions.map((option) => [option.value, option.label]))
  const hasFilters = filters.assignee.size > 0 || filters.status.size > 0 || filters.priority.size > 0

  return (
    <section aria-label="Task filters" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-heading">Filter tasks</span>
        <FilterMenu label="Assignee" options={assigneeOptions} selected={filters.assignee} onToggle={(value) => onToggle('assignee', value)} />
        <FilterMenu label="Status" options={STATUSES} selected={filters.status} onToggle={(value) => onToggle('status', value)} />
        <FilterMenu label="Priority" options={PRIORITIES} selected={filters.priority} onToggle={(value) => onToggle('priority', value)} />
        {hasFilters && (
          <button type="button" onClick={onClear} className="min-h-11 rounded-control px-3 text-label font-medium text-heading underline hover:bg-surface-subtle">
            Clear filters
          </button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {[...filters.assignee].map((value) => (
            <FilterChip key={`assignee-${value}`} label={`Assignee: ${assigneeNames.get(value) ?? value}`} onRemove={() => onToggle('assignee', value)} />
          ))}
          {[...filters.status].map((value) => (
            <FilterChip key={`status-${value}`} label={`Status: ${statusLabel(value)}`} onRemove={() => onToggle('status', value)} />
          ))}
          {[...filters.priority].map((value) => (
            <FilterChip key={`priority-${value}`} label={`Priority: ${priorityLabel(value)}`} onRemove={() => onToggle('priority', value)} />
          ))}
        </div>
      )}
    </section>
  )
}
