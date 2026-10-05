import { useState } from 'react'
import { errorMessage } from '../../api/errors.js'
import { useCreateTask } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import TaskFields from './TaskFields.jsx'
import { emptyTaskValues } from './taskValues.js'

// US-13: title and at least one assignee are required; a new task starts in To Do.
export default function CreateTaskDialog({ open, onClose, projectId, members, onCreated }) {
  const createTask = useCreateTask(projectId)
  const [values, setValues] = useState(emptyTaskValues)

  function close() {
    setValues(emptyTaskValues())
    createTask.reset()
    onClose()
  }

  function submit(event) {
    event.preventDefault()
    createTask.mutate(values, {
      onSuccess: (task) => {
        close()
        onCreated(task)
      },
    })
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create a task"
      description="Description, priority and due date are optional. A new task starts in To Do."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="create-task-form" loading={createTask.isPending}>
            Create task
          </Button>
        </>
      }
    >
      <form id="create-task-form" onSubmit={submit} noValidate>
        <TaskFields values={values} onChange={setValues} members={members} error={createTask.error} />
        {createTask.isError && !createTask.error.fieldErrors?.length && (
          <p role="alert" className="mt-4 text-base text-blocked">
            {errorMessage(createTask.error)}
          </p>
        )}
      </form>
    </Dialog>
  )
}
