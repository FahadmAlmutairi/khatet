import { useState } from 'react'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useCreateProject } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { TextArea, TextField } from '../../components/ui/Field.jsx'

// US-05: a project needs a name; the description is optional.
export default function CreateProjectDialog({ open, onClose, onCreated }) {
  const createProject = useCreateProject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function close() {
    setName('')
    setDescription('')
    createProject.reset()
    onClose()
  }

  function submit(event) {
    event.preventDefault()
    createProject.mutate(
      { name, description },
      {
        onSuccess: (project) => {
          close()
          onCreated?.(project)
        },
      },
    )
  }

  const nameError = fieldError(createProject.error, 'name')

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create a project"
      description="You become the project owner and can invite your team from the Members page."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="create-project-form" loading={createProject.isPending}>
            Create project
          </Button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Project name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError}
          autoFocus
        />
        <TextArea
          label="Description"
          hint="Optional. What is this project about?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {createProject.isError && !nameError && (
          <p role="alert" className="text-base text-blocked">
            {errorMessage(createProject.error)}
          </p>
        )}
      </form>
    </Dialog>
  )
}
