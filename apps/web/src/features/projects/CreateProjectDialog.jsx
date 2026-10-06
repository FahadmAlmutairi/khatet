import { useId, useState } from 'react'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useCreateProject } from '../../api/hooks.js'
import { Spinner } from '../../components/ui/Button.jsx'
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
        <div className="flex flex-col gap-1.5 leading-normal">
          <h2 id={titleId} className="text-[26px] font-bold text-body sm:text-2xl">
            Create a project
          </h2>
          <p className="text-sm text-muted">
            <span className="sm:hidden">You become the Project Owner and can invite teammates after creation.</span>
            <span className="max-sm:hidden">You can change any of this later in Project settings.</span>
          </p>
        </div>
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
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 items-center rounded-[9px] border border-line bg-white px-[18px] text-sm font-medium text-body hover:bg-surface max-sm:hidden"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createProject.isPending}
            aria-busy={createProject.isPending || undefined}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-action px-[18px] text-sm font-semibold text-white hover:bg-heading disabled:cursor-not-allowed sm:w-auto sm:rounded-[9px]"
          >
            {createProject.isPending && <Spinner />}
            Create project
          </button>
        </div>
      </form>
    </Dialog>
  )
}
