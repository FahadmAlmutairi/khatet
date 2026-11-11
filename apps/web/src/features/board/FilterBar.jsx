import { useEffect, useRef, useState } from 'react'
import { ChevronIcon } from '../../components/icons.jsx'
import { PRIORITIES, STATUSES, priorityLabel, statusLabel } from '../../lib/domain.js'

// Only one menu is open at a time, and it closes on Escape or a click outside it (review M5).
function FilterMenu({ label, options, selected, onToggle, open, onOpenChange }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!ref.current?.contains(event.target)) onOpenChange(false)
    }
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      onOpenChange(false)
      ref.current?.querySelector('summary')?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  return (
    <details ref={ref} open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)} className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-line bg-white px-3 text-label font-medium text-heading hover:bg-surface [&::-webkit-details-marker]:hidden">
        {label}
        {selected.size > 0 && (
          <span className="inline-flex min-w-5 justify-center rounded-full bg-nav-active px-1 text-xs">
            {selected.size}
            <span className="sr-only"> selected</span>
          </span>
        )}
        <span className="-mr-0.5 inline-flex text-muted transition-transform duration-200 group-open:rotate-180">
          <ChevronIcon direction="down" size={14} />
        </span>
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
  const activeCount = filters.assignee.size + filters.status.size + filters.priority.size
  const hasFilters = activeCount > 0
  const [openMenu, setOpenMenu] = useState(null)
  // On a phone the menus sit behind one Filter button, so the first lane starts higher up (review M6).
  const [shownOnPhone, setShownOnPhone] = useState(false)
  const menuProps = (key) => ({
    open: openMenu === key,
    onOpenChange: (next) => setOpenMenu((current) => (next ? key : current === key ? null : current)),
  })

  return (
    <section aria-label="Task filters" className="flex flex-col gap-3 max-sm:gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-3 max-sm:border-0 max-sm:bg-transparent max-sm:p-0 sm:p-4">
      <button
        type="button"
        onClick={() => setShownOnPhone((value) => !value)}
        aria-expanded={shownOnPhone}
        aria-controls="filter-menus"
        className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-line bg-white px-3 text-label font-medium text-heading sm:hidden"
      >
        <span>
          Filter tasks
          {hasFilters && ` (${activeCount})`}
        </span>
        <span className={`inline-flex text-muted transition-transform duration-200 ${shownOnPhone ? 'rotate-180' : ''}`}>
          <ChevronIcon direction="down" size={14} />
        </span>
      </button>
      <div id="filter-menus" className={`${shownOnPhone ? 'flex' : 'hidden'} flex-wrap items-center gap-2 sm:flex`}>
        <span className="mr-1 text-sm font-medium text-heading max-sm:sr-only">Filter tasks</span>
        <FilterMenu label="Assignee" options={assigneeOptions} selected={filters.assignee} onToggle={(value) => onToggle('assignee', value)} {...menuProps('assignee')} />
        <FilterMenu label="Status" options={STATUSES} selected={filters.status} onToggle={(value) => onToggle('status', value)} {...menuProps('status')} />
        <FilterMenu label="Priority" options={PRIORITIES} selected={filters.priority} onToggle={(value) => onToggle('priority', value)} {...menuProps('priority')} />
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
