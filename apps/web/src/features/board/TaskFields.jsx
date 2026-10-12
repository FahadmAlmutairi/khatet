import { fieldError } from '../../api/errors.js'
import { useId } from 'react'
import { TextArea, TextField } from '../../components/ui/Field.jsx'
import { dateFromToday, formatDueDate, PRIORITIES } from '../../lib/domain.js'
import AssigneePicker from './AssigneePicker.jsx'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// The browser's date field follows its own locale (for example mm/dd/yyyy), so the picked
// date is also written the way the rest of Khatet writes dates: "Wednesday 15 Oct 2026".
function dateInWords(value) {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return `${WEEKDAYS[new Date(year, month - 1, day).getDay()]} ${formatDueDate(value)}`
}

// Priority pills look like the badges on the cards; they are radio buttons, so arrow keys move between them.
const PRIORITY_TONES = {
  '': 'peer-checked:border-action peer-checked:bg-nav-active peer-checked:text-heading',
  LOW: 'peer-checked:border-priority-low-text peer-checked:bg-priority-low-bg peer-checked:text-priority-low-text',
  MEDIUM: 'peer-checked:border-priority-medium-text peer-checked:bg-priority-medium-bg peer-checked:text-priority-medium-text',
  HIGH: 'peer-checked:border-priority-high-text peer-checked:bg-priority-high-bg peer-checked:text-priority-high-text',
}

function PriorityPicker({ value, onChange, error }) {
  const id = useId()
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-body">Priority</legend>
      <div className="flex flex-wrap gap-2 lg:gap-1.5">
        {[{ value: '', label: 'None' }, ...PRIORITIES].map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={`${id}-priority`}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-white px-3 text-xs font-medium text-heading hover:bg-surface peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus lg:min-h-8 lg:px-2.5 ${PRIORITY_TONES[option.value]}`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-blocked">
          {error}
        </p>
      )}
    </fieldset>
  )
}

const DATE_SHORTCUTS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
]

// The fields shared by Create task (US-13) and Edit task (US-15). Phase (US-20) arrives in Sprint 3.
export default function TaskFields({ values, onChange, members, error }) {
  function set(field) {
    return (event) => onChange({ ...values, [field]: event.target.value })
  }

  return (
    <div className="flex flex-col gap-5">
      <TextField
        label="Task title"
        required
        value={values.title}
        onChange={set('title')}
        placeholder="e.g. Prepare usability session"
        error={fieldError(error, 'title')}
      />
      <AssigneePicker
        required
        members={members}
        value={values.assigneeIds}
        onChange={(assigneeIds) => onChange({ ...values, assigneeIds })}
        error={fieldError(error, 'assigneeIds')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <TextField
            label="Due date"
            type="date"
            value={values.dueDate}
            onChange={set('dueDate')}
            hint={dateInWords(values.dueDate)}
            error={fieldError(error, 'dueDate')}
          />
          {/* T5: one tap for the most common due dates. */}
          <div role="group" aria-label="Quick due dates" className="flex flex-wrap gap-2 lg:gap-1.5">
            {DATE_SHORTCUTS.map((shortcut) => {
              const date = dateFromToday(shortcut.days)
              return (
                <button
                  key={shortcut.label}
                  type="button"
                  aria-pressed={values.dueDate === date}
                  onClick={() => onChange({ ...values, dueDate: date })}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-3 text-xs font-medium text-heading hover:bg-surface lg:px-2.5 aria-pressed:border-action aria-pressed:bg-nav-active lg:min-h-8"
                >
                  {shortcut.label}
                </button>
              )
            })}
          </div>
        </div>
        <PriorityPicker
          value={values.priority}
          onChange={(priority) => onChange({ ...values, priority })}
          error={fieldError(error, 'priority')}
        />
      </div>
      <TextArea
        label="Description"
        rows={3}
        value={values.description}
        onChange={set('description')}
        placeholder="Add context, requirements, or useful links…"
      />
    </div>
  )
}
