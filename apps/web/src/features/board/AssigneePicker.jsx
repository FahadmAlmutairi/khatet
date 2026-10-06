import { useEffect, useId, useRef, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import { CheckIcon, CloseIcon } from '../../components/icons.jsx'

// Assignees are chosen from a searchable list of project members, like a card's
// Members list in Trello (Figma: Task Details / Modal / Edit mode, assignee picker open).
export default function AssigneePicker({ members, value, onChange, error, required }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const id = useId()
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const searchRef = useRef(null)

  const selected = value.map((userId) => members.find((member) => member.userId === userId)).filter(Boolean)
  const needle = query.trim().replace(/^@/, '').toLowerCase()
  const shown = members.filter((member) => member.username.toLowerCase().includes(needle))

  useEffect(() => {
    if (!open) return undefined
    searchRef.current?.focus()
    function onPointerDown(event) {
      if (!popoverRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
    buttonRef.current?.focus()
  }

  function toggle(userId) {
    onChange(value.includes(userId) ? value.filter((item) => item !== userId) : [...value, userId])
  }

  return (
    <div role="group" data-invalid={error ? 'true' : undefined} aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-error` : undefined} className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium text-body">
        Assignees
        {required && (
          <>
            <span aria-hidden="true" className="text-attention"> *</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </span>
      <div className={`relative flex flex-wrap items-center gap-2 rounded-lg ${error ? 'outline-2 outline-offset-2 outline-blocked' : ''}`}>
        {selected.map((member) => (
          <span key={member.userId} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-nav-active pr-1 pl-1 text-sm text-body lg:h-8">
            <Avatar username={member.username} size="xs" />@{member.username}
            <button
              type="button"
              onClick={() => toggle(member.userId)}
              aria-label={`Remove @${member.username}`}
              className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-white lg:size-6"
            >
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
        <button
          ref={buttonRef}
          type="button"
          aria-label="Add assignee"
          aria-expanded={open}
          aria-controls={open ? `${id}-popover` : undefined}
          onClick={() => (open ? close() : setOpen(true))}
          className="inline-flex h-11 items-center gap-1 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-heading hover:bg-surface lg:h-8"
        >
          + Add
        </button>
        {open && (
          <div
            ref={popoverRef}
            id={`${id}-popover`}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                close()
              }
            }}
            className="absolute top-full right-0 z-30 mt-1.5 flex w-[300px] max-w-full flex-col gap-1 rounded-xl border border-line bg-white p-2 shadow-[0_12px_24px_rgba(38,54,41,0.16)] sm:right-auto sm:left-0"
          >
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search members"
              aria-label="Search members"
              className="h-11 w-full rounded-lg border-2 border-action bg-white px-3 focus-visible:outline-none text-sm text-body placeholder:text-muted"
            />
            <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted">Project members</p>
            <ul className="flex flex-col gap-1">
              {shown.map((member) => {
                const checked = value.includes(member.userId)
                return (
                  <li key={member.userId}>
                    <button
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggle(member.userId)}
                      className={`flex h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm text-body hover:bg-surface ${
                        checked ? 'bg-nav-active font-medium' : ''
                      }`}
                    >
                      <Avatar username={member.username} />
                      <span className="flex-1">@{member.username}</span>
                      {checked && <CheckIcon />}
                    </button>
                  </li>
                )
              })}
              {shown.length === 0 && <li className="px-2 py-3 text-sm text-muted">No member matches “{query}”.</li>}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-blocked">
          {error}
        </p>
      )}
    </div>
  )
}
