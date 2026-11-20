import { errorMessage } from '../../api/errors.js'
import { useDeleteArchivedProject } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { FieldError } from '../../components/ui/Field.jsx'
import { useToast } from '../../components/ui/toastContext.js'

// Deletes the archived project log for the signed-in user only. The other members keep theirs;
// the project is removed for good once every member has deleted it.
export default function DeleteArchivedDialog({ project, onClose, onDeleted }) {
  const remove = useDeleteArchivedProject()
  const toast = useToast()

  function close() {
    remove.reset()
    onClose()
  }

  function confirm() {
    remove.mutate(project.id, {
      onSuccess: () => {
        toast(`You deleted the log of ${project.name}.`)
        onDeleted?.()
        onClose()
      },
    })
  }

  return (
    <Dialog
      open={Boolean(project)}
      onClose={close}
      title={project ? `Delete the log of ${project.name}?` : ''}
      description="This removes it from your account for good. Other members keep their copy until they delete it too."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={confirm}>
            Delete permanently
          </Button>
        </>
      }
    >
      {remove.isError && <FieldError role="alert">{errorMessage(remove.error)}</FieldError>}
    </Dialog>
  )
}
