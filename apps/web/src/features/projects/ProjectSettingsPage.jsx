import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { apiReady } from '../../api/config.js'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useUpdateProject } from '../../api/hooks.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import Button from '../../components/ui/Button.jsx'
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
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title font-bold text-body">Project settings</h1>
        <p className="text-sm text-muted">Update the name and description shown across this workspace.</p>
      </div>
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
    </section>
  )
}
