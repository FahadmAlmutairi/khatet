import { fieldError } from '../../api/errors.js'
import { SelectField, TextArea, TextField } from '../../components/ui/Field.jsx'
import { dateFromToday, PRIORITIES } from '../../lib/domain.js'
import AssigneePicker from './AssigneePicker.jsx'

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
          <TextField label="Due date" type="date" value={values.dueDate} onChange={set('dueDate')} error={fieldError(error, 'dueDate')} />
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
        <SelectField
          label="Priority"
          value={values.priority}
          onChange={set('priority')}
          options={[{ value: '', label: 'No priority' }, ...PRIORITIES]}
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
