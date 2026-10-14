import { useEffect, useId, useRef, useState } from 'react'
import { errorMessage } from '../../api/errors.js'
import { useDeleteTaskWithUndo, useTask, useUpdateTask } from '../../api/hooks.js'
import { AvatarStack } from '../../components/Avatar.jsx'
import { ChevronIcon, CloseIcon, MoreIcon, OverdueIcon } from '../../components/icons.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import DiscardChangesDialog from '../../components/ui/DiscardChangesDialog.jsx'
import { SAVE_SHORTCUT_HINT, sameValues, submitOnCtrlEnter, useFocusFirstError } from '../../components/ui/formState.js'
import Menu from '../../components/ui/Menu.jsx'
import InfoTip from '../../components/ui/InfoTip.jsx'
import { ErrorState, LoadingState, Notice, StateBadge } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { dueLine, formatDueDate, statusLabel } from '../../lib/domain.js'
import { fadeOutCard, rememberCardPositions } from '../../lib/motion.js'
import { moveMenuItems } from './moveMenu.jsx'
import TaskFields from './TaskFields.jsx'
import { taskValues } from './taskValues.js'
import { FieldError } from '../../components/ui/Field.jsx'

// Colours of the Figma "Status Badge" component.
const STATUS_TONES = {
  BACKLOG: 'bg-[#ecefec] text-[#4e5650]',
  TODO: 'bg-[#ecefec] text-[#4e5650]',
  IN_PROGRESS: 'bg-[#d4faf4] text-[#17665b]',
  READY_FOR_REVIEW: 'bg-[#fff1cc] text-[#7a5310]',
  DONE: 'bg-[#d9f2df] text-[#246b3a]',
}

const outlineButton =
  'inline-flex h-11 items-center justify-center rounded-control border border-line bg-white text-label font-medium text-heading hover:bg-surface lg:h-10'

function TopBar({ eyebrow, children, onClose }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-medium whitespace-pre text-muted">{eyebrow}</p>
      <div className="flex items-center gap-2">
        {children}
        <button type="button" onClick={onClose} aria-label="Close" className={`${outlineButton} w-11 lg:w-10`}>
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

// US-16: the status pill is the control that changes the status.
function StatusControl({ task, onMove }) {
  const tone = STATUS_TONES[task.status]
  if (!task.permissions.canMove) {
    return (
      <span className={`inline-flex h-9 w-fit items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-300 ${tone}`}>
        <StatusIcon status={task.status} />
        {statusLabel(task.status)}
      </span>
    )
  }
  return (
    <Menu
      label={`Status: ${statusLabel(task.status)}. Change status`}
      align="left"
      listClassName="w-[260px]"
      buttonContent={
        <>
          <StatusIcon status={task.status} />
          {statusLabel(task.status)}
          <ChevronIcon direction="down" size={12} />
        </>
      }
      buttonClassName={`inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-300 lg:h-9 ${tone}`}
      items={moveMenuItems(task, onMove, { heading: 'Change status', note: true })}
    />
  )
}

function Detail({ label, children }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <dt className="text-xs font-medium tracking-[0.5px] text-muted uppercase">{label}</dt>
      <dd className="flex min-h-8 items-center gap-2 text-sm text-body">{children}</dd>
    </div>
  )
}

// US-17: only an In Progress task can be flagged; it stays In Progress.
function BlockedControl({ task }) {
  const updateTask = useUpdateTask()
  const toast = useToast()
  const [reason, setReason] = useState(task.blockedReason ?? '')
  const [savedReason, setSavedReason] = useState(false)
  // When the reason changes elsewhere (Undo, another member), the field follows it.
  const [knownReason, setKnownReason] = useState(task.blockedReason ?? '')
  if ((task.blockedReason ?? '') !== knownReason) {
    setKnownReason(task.blockedReason ?? '')
    setReason(task.blockedReason ?? '')
  }
  const id = useId()

  // The reason saves itself when the field loses focus or on Enter, and says "Saved" for a moment.
  function saveReason() {
    if (reason === (task.blockedReason ?? '') || updateTask.isPending) return
    save(true, reason, { quiet: true, onSaved: () => setSavedReason(true) })
  }

  useEffect(() => {
    if (!savedReason) return undefined
    const timer = setTimeout(() => setSavedReason(false), 2000)
    return () => clearTimeout(timer)
  }, [savedReason])

  function save(isBlocked, blockedReason = reason, { quiet = false, onSaved } = {}) {
    const before = { isBlocked: task.isBlocked, blockedReason: task.blockedReason }
    updateTask.mutate(
      { taskId: task.id, patch: { isBlocked, blockedReason } },
      {
        onSuccess: () => {
          onSaved?.()
          if (quiet) return
          const message = isBlocked ? 'The task is flagged as blocked.' : 'The blocked flag was removed.'
          // Saving only the reason needs no Undo; turning the flag on or off does.
          if (before.isBlocked === isBlocked) return toast(message)
          toast(message, 'info', {
            onUndo: () => {
              setReason(before.blockedReason ?? '')
              save(before.isBlocked, before.blockedReason, { quiet: true })
            },
          })
        },
        onError: (error) => toast(errorMessage(error), 'error'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <p id={`${id}-label`} className="text-base font-medium text-body">
            Blocked
          </p>
          <InfoTip label="About Blocked">For a task in progress that can't move forward. The card shows a Blocked label.</InfoTip>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={task.isBlocked}
          aria-labelledby={`${id}-label`}
          disabled={updateTask.isPending}
          onClick={() => save(!task.isBlocked)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <span
            aria-hidden="true"
            className={`relative h-[26px] w-11 rounded-full transition-colors ${task.isBlocked ? 'bg-action' : 'bg-[#c9cfc7]'}`}
          >
            <span
              className={`absolute top-[3px] left-[3px] size-5 rounded-full bg-white transition-transform ${task.isBlocked ? 'translate-x-[18px]' : ''}`}
            />
          </span>
        </button>
      </div>
      {task.isBlocked && (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            saveReason()
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${id}-reason`} className="text-xs font-medium text-body">
              Reason (optional)
            </label>
            <p aria-live="polite" className="text-xs font-medium text-action">
              {savedReason ? 'Saved' : ''}
            </p>
          </div>
          <input
            id={`${id}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={(event) => {
              // Turning the flag off from here clears the reason anyway, so only that change is sent.
              if (event.relatedTarget?.getAttribute('role') === 'switch') return
              saveReason()
            }}
            enterKeyHint="done"
            className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm text-body"
          />
        </form>
      )}
    </div>
  )
}

function DeleteTaskDialog({ open, task, onCancel, onDeleted, projectId }) {
  const deleteLater = useDeleteTaskWithUndo(projectId)
  const toast = useToast()

  // The card fades out, the cards below close the gap, and the server delete waits for the Undo time.
  async function remove() {
    onDeleted()
    await fadeOutCard(task.id)?.finished.catch(() => {})
    rememberCardPositions()
    const pending = deleteLater(task)
    toast(`“${task.title}” was deleted.`, 'info', {
      onUndo: () => {
        rememberCardPositions()
        pending.restore()
      },
      onExpire: () =>
        pending.commit().catch((error) => toast(`“${task.title}” could not be deleted. ${errorMessage(error)}`, 'error')),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Delete this task?"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove}>
            Delete task
          </Button>
        </>
      }
    >
      <p className="text-base">“{task.title}” will be removed from the board for everyone in the project.</p>
    </Dialog>
  )
}

function TaskView({ task, titleId, eyebrow, usernames, onClose, onEdit, onDelete, onMove }) {
  const { canEdit, canDelete } = task.permissions
  const assignees = task.assigneeIds.map((id) => ({ id, username: usernames.get(id) ?? 'unknown' }))
  const due = dueLine(task.dueDate, task.status)

  return (
    <div className="flex flex-col gap-5">
      <TopBar eyebrow={eyebrow} onClose={onClose}>
        {canEdit && (
          <button type="button" onClick={onEdit} className={`${outlineButton} px-4`}>
            Edit
          </button>
        )}
        {canDelete && (
          <Menu
            label="More actions"
            buttonContent={<MoreIcon />}
            buttonClassName={`${outlineButton} w-11 lg:w-10`}
            items={[{ key: 'delete', label: 'Delete task', danger: true, onSelect: onDelete }]}
          />
        )}
      </TopBar>

      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-xl leading-[26px] font-bold text-body sm:text-2xl sm:leading-[30px]">
          {task.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusControl task={task} onMove={onMove} />
          {!canEdit && (
            <StateBadge label="View only">You can view this task but not change it. Ask the project owner for edit access.</StateBadge>
          )}
        </div>
      </div>


      <dl className="flex flex-col gap-4 rounded-card border border-line p-4 sm:flex-row sm:gap-6">
        <Detail label="Assignees">
          <AvatarStack users={assignees} />
          <span className="min-w-0">{assignees.map((user) => `@${user.username}`).join(', ')}</span>
        </Detail>
        <Detail label="Priority">{task.priority ? <PriorityBadge priority={task.priority} /> : 'No priority'}</Detail>
        <Detail label="Due date">
          <span className={due.overdue ? 'inline-flex items-center gap-1 text-blocked' : ''}>
            {due.overdue && <OverdueIcon />}
            {/* One text run, so the date and "Overdue" stay on a line and wrap as words, not as columns. */}
            <span>
              {task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}
              {due.overdue && <span className="font-medium whitespace-nowrap"> · Overdue</span>}
            </span>
          </span>
        </Detail>
      </dl>

      {task.status === 'IN_PROGRESS' && canEdit && <BlockedControl task={task} />}
      {task.isBlocked && !canEdit && (
        <Notice tone="warning">
          <strong className="font-semibold">Blocked</strong>
          {task.blockedReason ? `: ${task.blockedReason}` : ''}
        </Notice>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-body">Description</h3>
        <p className="text-sm leading-[21px] whitespace-pre-line text-muted">{task.description || 'No description yet.'}</p>
      </div>
    </div>
  )
}

function TaskEditForm({ task, titleId, eyebrow, members, onClose, onDone, registerCloseGuard }) {
  const updateTask = useUpdateTask()
  const toast = useToast()
  const [values, setValues] = useState(() => taskValues(task))
  const [pendingLeave, setPendingLeave] = useState(null)
  const formRef = useRef(null)
  useFocusFirstError(formRef, updateTask.error)
  const dirty = !sameValues(values, taskValues(task))

  // T1: closing the window or cancelling asks first when there are unsaved changes.
  function leave(next) {
    if (dirty) setPendingLeave(() => next)
    else next()
  }

  useEffect(() => {
    registerCloseGuard(leave)
    return () => registerCloseGuard(null)
  })

  function submit(event) {
    event.preventDefault()
    updateTask.mutate(
      { taskId: task.id, patch: values },
      {
        onSuccess: () => {
          toast('Your changes were saved.')
          onDone()
        },
      },
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} onKeyDown={submitOnCtrlEnter} noValidate className="flex flex-col gap-5">
      <TopBar eyebrow={eyebrow} onClose={() => leave(onClose)} />
      <h2 id={titleId} className="text-xl leading-[30px] font-bold text-body sm:text-2xl">
        Edit task
      </h2>
      <TaskFields values={values} onChange={setValues} members={members} error={updateTask.error} />
      {updateTask.isError && !updateTask.error.fieldErrors?.length && (
        <FieldError role="alert">{errorMessage(updateTask.error)}</FieldError>
      )}
      <div className="flex justify-end gap-3">
        <p aria-hidden="true" className="mr-auto hidden self-center text-xs text-muted lg:block">
          {SAVE_SHORTCUT_HINT}
        </p>
        <Button variant="secondary" onClick={() => leave(onDone)}>
          Cancel
        </Button>
        <Button type="submit" aria-keyshortcuts="Control+Enter Meta+Enter" loading={updateTask.isPending}>
          Save changes
        </Button>
      </div>
      <DiscardChangesDialog
        open={Boolean(pendingLeave)}
        onKeep={() => setPendingLeave(null)}
        onDiscard={() => {
          const next = pendingLeave
          setPendingLeave(null)
          next()
        }}
      />
    </form>
  )
}

function TaskDetailsBody({ taskId, titleId, projectId, projectName, members, usernames, onClose, onMove, registerCloseGuard }) {
  const task = useTask(taskId)
  const [mode, setMode] = useState('view')
  const data = task.data

  if (task.isPending) return <LoadingState label="Loading task" />
  if (task.isError) {
    return (
      <div className="flex flex-col gap-5">
        <TopBar eyebrow={`${projectName}  /  Task`} onClose={onClose} />
        <h2 id={titleId} className="sr-only">
          Task details
        </h2>
        <ErrorState title="This task could not be opened" message={errorMessage(task.error)} />
      </div>
    )
  }

  return (
    <>
      {mode === 'edit' ? (
        <TaskEditForm
          task={data}
          titleId={titleId}
          eyebrow={`${projectName}  /  Edit task`}
          members={members}
          onClose={onClose}
          onDone={() => setMode('view')}
          registerCloseGuard={registerCloseGuard}
        />
      ) : (
        <TaskView
          task={data}
          titleId={titleId}
          eyebrow={`${projectName}  /  Task`}
          usernames={usernames}
          onClose={onClose}
          onEdit={() => setMode('edit')}
          onDelete={() => setMode('delete')}
          onMove={onMove}
        />
      )}
      <DeleteTaskDialog
        open={mode === 'delete'}
        task={data}
        projectId={projectId}
        onCancel={() => setMode('view')}
        onDeleted={onClose}
      />
    </>
  )
}

// US-14, US-15, US-16, US-17 and US-18 in a centred mini page (Figma: Task Details / Modal).
// The right side stays free for project chat. The body is keyed by task so a newly
// opened task always starts in view mode.
export default function TaskDetails({ taskId, onClose, ...props }) {
  const titleId = useId()
  // The edit form sets this so Esc and the backdrop also ask before discarding changes.
  const closeGuard = useRef(null)
  const requestClose = () => (closeGuard.current ? closeGuard.current(onClose) : onClose())
  const registerCloseGuard = (guard) => {
    closeGuard.current = guard
  }
  return (
    <Dialog open={Boolean(taskId)} onClose={requestClose} variant="panel" labelledBy={titleId}>
      {taskId && (
        <TaskDetailsBody key={taskId} taskId={taskId} titleId={titleId} onClose={onClose} registerCloseGuard={registerCloseGuard} {...props} />
      )}
    </Dialog>
  )
}
