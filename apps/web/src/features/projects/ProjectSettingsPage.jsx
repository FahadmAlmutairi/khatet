import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import { apiReady } from '../../api/config.js'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useArchiveProject, useUpdateProject } from '../../api/hooks.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { FieldError, TextArea, TextField } from '../../components/ui/Field.jsx'
import { useFocusFirstInvalid } from '../../components/ui/useFocusFirstInvalid.js'
import { useToast } from '../../components/ui/toastContext.js'
import { MAX_TEXT_LENGTH } from '../../lib/domain.js'

export default function ProjectSettingsPage() {
  const { project } = useOutletContext()
  const updateProject = useUpdateProject(project.id)
  const formRef = useFocusFirstInvalid(updateProject.error)
  const toast = useToast()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  useDocumentTitle('Project settings', project.name)

  if (project.role !== 'OWNER' || !apiReady.projectSettings) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-title font-bold text-body">Project settings</h1>
        <p className="text-muted">
          {project.role !== 'OWNER'
            ? 'Only the project owner can change project settings.'
            : 'Project settings are not available yet.'}
        </p>
      </section>
    )
  }

  const nameError = fieldError(updateProject.error, 'name')
  const descriptionError = fieldError(updateProject.error, 'description')

  function submit(event) {
    event.preventDefault()
    updateProject.mutate(
      { name, description },
      {
        onSuccess: (savedProject) => {
          setName(savedProject.name)
          setDescription(savedProject.description ?? '')
          toast('Project settings saved.')
        },
      },
    )
  }

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-title font-bold text-body">Project settings</h1>
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-xl border border-line bg-white p-5 sm:p-6">
        <TextField
          label="Project name"
          required
          maxLength={200}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            updateProject.reset()
          }}
          error={nameError}
        />
        <TextArea
          label="Description (optional)"
          rows={4}
          maxLength={MAX_TEXT_LENGTH}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
            updateProject.reset()
          }}
          error={descriptionError}
          className="resize-y"
        />
        {updateProject.isError && !nameError && !descriptionError && (
          <FieldError role="alert">{errorMessage(updateProject.error)}</FieldError>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={updateProject.isPending} fullOnPhone>
            Save changes
          </Button>
        </div>
      </form>
      <ArchiveSection project={project} />
    </section>
  )
}

// Archiving closes the board, chat and reports for everyone. The project log stays, so each
// member can still see who did what under Settings > Archived projects.
function ArchiveSection({ project }) {
  const [confirming, setConfirming] = useState(false)
  const archive = useArchiveProject(project.id)
  const navigate = useNavigate()
  const toast = useToast()

  function close() {
    setConfirming(false)
    archive.reset()
  }

  function confirm() {
    archive.mutate(undefined, {
      onSuccess: () => {
        navigate('/projects')
        toast(`${project.name} is archived. Its project log is in Settings.`)
      },
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-body">Archive project</h2>
      <p className="text-sm text-muted">
        The board, chat and reports close for everyone. The project log stays, so you and every member can still see
        who did what. Each person finds it in Settings, under Archived projects, and can delete it for themselves.
      </p>
      <div>
        <Button variant="danger" onClick={() => setConfirming(true)} fullOnPhone>
          Archive project
        </Button>
      </div>
      <Dialog
        open={confirming}
        onClose={close}
        title={`Archive ${project.name}?`}
        description="This cannot be undone. Tasks, chat and reports can no longer be opened. Pending invitations are cancelled. Every member keeps the project log in Settings."
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" loading={archive.isPending} onClick={confirm}>
              Archive project
            </Button>
          </>
        }
      >
        {archive.isError && <FieldError role="alert">{errorMessage(archive.error)}</FieldError>}
      </Dialog>
    </div>
  )
}
