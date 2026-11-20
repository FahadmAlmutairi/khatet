import { useNavigate } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useRestoreProject } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { FieldError } from '../../components/ui/Field.jsx'
import { useToast } from '../../components/ui/toastContext.js'

// Owner only: reopens the archived project for everyone it had, then opens its overview.
export default function RestoreProjectDialog({ project, onClose }) {
  const restore = useRestoreProject()
  const navigate = useNavigate()
  const toast = useToast()

  function close() {
    restore.reset()
    onClose()
  }

  function confirm() {
    restore.mutate(project.id, {
      onSuccess: () => {
        navigate(`/projects/${project.id}/overview`)
        toast(`${project.name} is restored.`)
        onClose()
      },
    })
  }

  return (
    <Dialog
      open={Boolean(project)}
      onClose={close}
      title={project ? `Restore ${project.name}?` : ''}
      description="The board, chat and reports open again for every member, with everything they had. Members who deleted their copy come back too. Cancelled invitations are not sent again."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button loading={restore.isPending} onClick={confirm}>
            Restore project
          </Button>
        </>
      }
    >
      {restore.isError && <FieldError role="alert">{errorMessage(restore.error)}</FieldError>}
    </Dialog>
  )
}
