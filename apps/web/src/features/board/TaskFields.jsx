import { fieldError } from '../../api/errors.js'
import { CheckboxGroup, SelectField, TextArea, TextField } from '../../components/ui/Field.jsx'
import { PRIORITIES } from '../../lib/domain.js'

// The fields shared by Create task (US-13) and Edit task (US-15). Phase (US-20) arrives in Sprint 3.
export default function TaskFields({ values, onChange, members, error }) {
  function set(field) {
    return (event) => onChange({ ...values, [field]: event.target.value })
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField label="Task title" required value={values.title} onChange={set('title')} error={fieldError(error, 'title')} />
      <CheckboxGroup
        legend="Assignees"
        required
        options={members.map((member) => ({ value: member.userId, label: `@${member.username}` }))}
        value={values.assigneeIds}
        onChange={(assigneeIds) => onChange({ ...values, assigneeIds })}
        error={fieldError(error, 'assigneeIds')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Priority"
          value={values.priority}
          onChange={set('priority')}
          options={[{ value: '', label: 'No priority' }, ...PRIORITIES]}
          error={fieldError(error, 'priority')}
        />
        <TextField label="Due date" type="date" value={values.dueDate} onChange={set('dueDate')} error={fieldError(error, 'dueDate')} />
      </div>
      <TextArea label="Description" rows={4} value={values.description} onChange={set('description')} />
    </div>
  )
}
