import Button from './Button.jsx'
import Dialog from './Dialog.jsx'

// Asked before a form with unsaved changes closes.
export default function DiscardChangesDialog({ open, onKeep, onDiscard }) {
  return (
    <Dialog
      open={open}
      onClose={onKeep}
      title="Discard your changes?"
      footer={
        <>
          <Button variant="secondary" onClick={onKeep}>
            Keep editing
          </Button>
          <Button variant="danger" onClick={onDiscard}>
            Discard changes
          </Button>
        </>
      }
    >
      <p className="text-base">The changes you made in this form will be lost.</p>
    </Dialog>
  )
}
