import { fieldError } from '../../api/errors.js'
import { useId } from 'react'
import { SmallCheckIcon } from '../../components/icons.jsx'
import { FieldError, TextArea, TextField } from '../../components/ui/Field.jsx'
import { dateFromToday, formatDueDate, PRIORITIES } from '../../lib/domain.js'
import AssigneePicker from './AssigneePicker.jsx'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// The browser's date field follows its own locale (for example mm/dd/yyyy), so the picked
// date is also written in words under it: "Thu 8 Oct", or "Sun 20 Sep · overdue" once it has passed.
function dateInWords(value) {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const words = `${WEEKDAYS[new Date(year, month - 1, day).getDay()]} ${formatDueDate(value, { short: true })}`
  return value < dateFromToday(0) ? `${words} · overdue` : words
}

// Priority pills keep the colours of the badges on the cards; the chosen one adds a tick and a
// dark border. They are radio buttons, so arrow keys move between them.
const PRIORITY_TONES = {
  '': 'bg-white text-heading',
  LOW: 'bg-priority-low-bg text-priority-low-text',
  MEDIUM: 'bg-priority-medium-bg text-priority-medium-text',
  HIGH: 'bg-priority-high-bg text-priority-high-text',
}

function PriorityPicker({ value, onChange, error }) {
  const id = useId()
  return (
    <fieldset data-field="priority" aria-describedby={error ? `${id}-error` : undefined} className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-body">Priority</legend>
      <div className="flex flex-wrap gap-2">
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
              className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full border border-line px-3 text-label font-medium hover:brightness-[0.97] peer-checked:border-[1.5px] peer-checked:border-action peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus lg:min-h-8 ${PRIORITY_TONES[option.value]}`}
            >
              {value === option.value && <SmallCheckIcon />}
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
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
        data-field="title"
        error={fieldError(error, 'title')}
      />
      <AssigneePicker
        required
        members={members}
        value={values.assigneeIds}
        onChange={(assigneeIds) => onChange({ ...values, assigneeIds })}
        error={fieldError(error, 'assigneeIds')}
      />
      <div className="flex flex-col gap-2">
        <TextField
          label="Due date"
          type="date"
          data-field="dueDate"
          value={values.dueDate}
          onChange={set('dueDate')}
          hint={dateInWords(values.dueDate)}
          hintClassName="text-xs text-muted"
          error={fieldError(error, 'dueDate')}
          className="sm:max-w-[287px]"
        />
        {/* T5: one tap for the most common due dates. */}
        <div role="group" aria-label="Quick due dates" className="flex flex-wrap gap-1.5">
          {DATE_SHORTCUTS.map((shortcut) => {
            const date = dateFromToday(shortcut.days)
            return (
              <button
                key={shortcut.label}
                type="button"
                aria-pressed={values.dueDate === date}
                onClick={() => onChange({ ...values, dueDate: date })}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-3 text-label text-heading hover:bg-surface aria-pressed:border-[1.5px] aria-pressed:border-action aria-pressed:bg-nav-active lg:min-h-8 lg:px-2.5"
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
      <TextArea
        label="Description"
        rows={3}
        value={values.description}
        onChange={set('description')}
        placeholder="Add context, requirements, or useful links…"
        data-field="description"
      />
    </div>
  )
}
