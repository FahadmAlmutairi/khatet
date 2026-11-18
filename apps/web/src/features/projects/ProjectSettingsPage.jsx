import { useState } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useDeleteProject } from '../../api/hooks.js'
import { useDocumentTitle, useBreadcrumb } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { FieldError, TextField } from '../../components/ui/Field.jsx'
import { useToast } from '../../components/ui/toastContext.js'

export default function ProjectSettingsPage() {
  const { project } = useOutletContext()
  const deleteProject = useDeleteProject(project.id)
  const [confirming, setConfirming] = useState(false)
  const [confirmationName, setConfirmationName] = useState('')
  const navigate = useNavigate()
  const toast = useToast()
  const crumbs = useBreadcrumb()
  const isOwner = project.permissions.canManageMembers
  useDocumentTitle('Project Settings', project.name)

  if (!isOwner) return <Navigate to="/projects" replace />

  function closeDialog() {
    setConfirming(false)
    setConfirmationName('')
    deleteProject.reset()
  }

  function confirmDelete(event) {
    event.preventDefault()
    deleteProject.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false)
        setConfirmationName('')
        toast('Project deleted')
        navigate('/projects', { replace: true })
      },
    })
  }

  return (
    <section className="flex min-h-[calc(100dvh-9rem)] flex-col gap-6">
      <Breadcrumb items={crumbs} className="lg:hidden" />
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold text-body">Project Settings</h1>
        <p className="text-sm text-muted">{project.name}</p>
      </div>

      <section aria-labelledby="danger-area-title" className="mt-auto rounded-xl border border-blocked bg-white p-5 sm:p-6">
        <h2 id="danger-area-title" className="text-lg font-semibold text-blocked">Danger area</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Deleting this project permanently removes it and all of its tasks and messages. This action cannot be undone.
        </p>
        <Button variant="danger" className="mt-5" onClick={() => setConfirming(true)}>
          Delete project
        </Button>
      </section>

      <Dialog
        open={confirming}
        onClose={closeDialog}
        title="Delete project?"
        description={`This will permanently delete “${project.name}”, including all tasks and messages. This action cannot be undone.`}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button
              variant="danger"
              type="submit"
              form="delete-project-form"
              loading={deleteProject.isPending}
              disabled={confirmationName !== project.name}
            >
              Delete project
            </Button>
          </>
        }
      >
        <form id="delete-project-form" onSubmit={confirmDelete} className="flex flex-col gap-4">
          <TextField
            label={`Type “${project.name}” to confirm`}
            value={confirmationName}
            onChange={(event) => setConfirmationName(event.target.value)}
            autoComplete="off"
            autoFocus
          />
          {deleteProject.isError && <FieldError role="alert">{errorMessage(deleteProject.error)}</FieldError>}
        </form>
      </Dialog>
    </section>
  )
}
