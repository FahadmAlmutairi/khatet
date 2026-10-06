import { fieldError } from '../../api/errors.js'
import { SelectField, TextArea, TextField } from '../../components/ui/Field.jsx'
import { PRIORITIES } from '../../lib/domain.js'
import AssigneePicker from './AssigneePicker.jsx'

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
        <TextField label="Due date" type="date" value={values.dueDate} onChange={set('dueDate')} error={fieldError(error, 'dueDate')} />
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
