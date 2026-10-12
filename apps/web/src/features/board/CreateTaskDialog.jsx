import { useId, useRef, useState } from 'react'
import { errorMessage } from '../../api/errors.js'
import { useCreateTask } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog, { MobileBackBar } from '../../components/ui/Dialog.jsx'
import DiscardChangesDialog from '../../components/ui/DiscardChangesDialog.jsx'
import { SAVE_SHORTCUT_HINT, sameValues, submitOnCtrlEnter, useFocusFirstError } from '../../components/ui/formState.js'
import { rememberCardPositions } from '../../lib/motion.js'
import TaskFields from './TaskFields.jsx'
import { emptyTaskValues } from './taskValues.js'

// US-13: title and at least one assignee are required; a new task starts in To Do.
// Figma: a centred window on desktop (1068:11244) and a full page on mobile (736:2).
// Phase (US-20) arrives in Sprint 3, so its field stays hidden.
export default function CreateTaskDialog({ open, onClose, projectId, members, onCreated }) {
  const createTask = useCreateTask(projectId)
  const [values, setValues] = useState(emptyTaskValues)
  const [confirming, setConfirming] = useState(false)
  const titleId = useId()
  const formRef = useRef(null)
  useFocusFirstError(formRef, createTask.error)

  function close() {
    setConfirming(false)
    setValues(emptyTaskValues())
    createTask.reset()
    onClose()
  }

  // T1: ask before throwing away what was typed.
  function requestClose() {
    if (sameValues(values, emptyTaskValues())) close()
    else setConfirming(true)
  }

  function submit(event) {
    event.preventDefault()
    rememberCardPositions()
    createTask.mutate(values, {
      onSuccess: (task) => {
        close()
        onCreated(task)
      },
    })
  }

  return (
    <Dialog open={open} onClose={requestClose} variant="page" labelledBy={titleId}>
      <MobileBackBar label="Board" onBack={requestClose} title="Create task" />
      <form ref={formRef} onSubmit={submit} onKeyDown={submitOnCtrlEnter} noValidate className="flex flex-col gap-4 px-5 pt-3 pb-6 sm:p-6">
        <h2 id={titleId} className="sr-only text-2xl font-semibold text-body sm:not-sr-only">
          Create a task
        </h2>
        <TaskFields values={values} onChange={setValues} members={members} error={createTask.error} />
        {createTask.isError && !createTask.error.fieldErrors?.length && (
          <p role="alert" className="text-sm text-blocked">
            {errorMessage(createTask.error)}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-3 sm:mt-4">
          <p aria-hidden="true" className="mr-auto hidden self-center text-xs text-muted lg:block">
            {SAVE_SHORTCUT_HINT}
          </p>
          <Button variant="secondary" onClick={requestClose} className="max-sm:hidden">
            Cancel
          </Button>
          <Button type="submit" aria-keyshortcuts="Control+Enter Meta+Enter" loading={createTask.isPending} fullOnPhone>
            Create task
          </Button>
        </div>
      </form>
      <DiscardChangesDialog open={confirming} onKeep={() => setConfirming(false)} onDiscard={close} />
    </Dialog>
  )
}
