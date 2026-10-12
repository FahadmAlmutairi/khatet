import { useId, useState } from 'react'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useCreateProject } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog, { MobileBackBar } from '../../components/ui/Dialog.jsx'
import { TextArea, TextField } from '../../components/ui/Field.jsx'

// US-05: a project needs a name; the description is optional.
// Figma: a centred window on desktop (1035:6527) and a full page on mobile (744:2).
export default function CreateProjectDialog({ open, onClose, onCreated }) {
  const createProject = useCreateProject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const titleId = useId()

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
    <Dialog open={open} onClose={close} variant="page" width={560} labelledBy={titleId}>
      <MobileBackBar label="Home" onBack={close} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-5 pt-3 pb-6 sm:p-7">
        <h2 id={titleId} className="text-[26px] leading-normal font-bold text-body sm:text-2xl">
          Create a project
        </h2>
        <TextField
          label="Project name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Website redesign"
          error={nameError}
          autoFocus
        />
        <TextArea
          label="Description"
          rows={1}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this project about? (optional)"
          className="h-24 resize-none sm:h-11"
        />
        {createProject.isError && !nameError && (
          <p role="alert" className="text-sm text-blocked">
            {errorMessage(createProject.error)}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={close} className="max-sm:hidden">
            Cancel
          </Button>
          <Button type="submit" loading={createProject.isPending} fullOnPhone>
            Create project
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
