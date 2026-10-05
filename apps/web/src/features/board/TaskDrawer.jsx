import { useState } from 'react'
import { errorMessage } from '../../api/errors.js'
import { useDeleteTask, useTask, useUpdateTask } from '../../api/hooks.js'
import { MoreIcon } from '../../components/icons.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import Menu from '../../components/ui/Menu.jsx'
import { ErrorState, LoadingState, Notice } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { formatDueDate, statusLabel } from '../../lib/domain.js'
import { moveMenuItems } from './moveMenu.jsx'
import TaskFields from './TaskFields.jsx'
import { taskValues } from './taskValues.js'

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-base text-body">{children}</dd>
    </div>
  )
}

// US-17: only an In Progress task can be flagged; it stays In Progress.
function BlockedControl({ task }) {
  const updateTask = useUpdateTask()
  const toast = useToast()
  const [reason, setReason] = useState(task.blockedReason ?? '')

  function save(isBlocked, blockedReason = reason) {
    updateTask.mutate(
      { taskId: task.id, patch: { isBlocked, blockedReason } },
      {
        onSuccess: () => toast(isBlocked ? 'The task is flagged as blocked.' : 'The blocked flag was removed.'),
        onError: (error) => toast(errorMessage(error), 'error'),
      },
    )
  }

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p id={`blocked-${task.id}`} className="text-base font-semibold text-heading">
            Blocked
          </p>
          <p className="text-sm text-muted">Only for tasks in progress. The card shows a Blocked label.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={task.isBlocked}
          aria-labelledby={`blocked-${task.id}`}
          disabled={updateTask.isPending}
          onClick={() => save(!task.isBlocked)}
          className={`relative inline-flex h-11 w-16 shrink-0 items-center rounded-full p-1 transition-colors ${
            task.isBlocked ? 'bg-action' : 'bg-surface-supporting'
          }`}
        >
          <span
            aria-hidden="true"
            className={`size-6 rounded-full bg-white shadow transition-transform ${task.isBlocked ? 'translate-x-7' : 'translate-x-1'}`}
          />
        </button>
      </div>
      {task.isBlocked && (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            save(true)
          }}
        >
          <div className="flex-1">
            <TextField label="Reason (optional)" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <Button type="submit" variant="secondary" disabled={reason === (task.blockedReason ?? '')} loading={updateTask.isPending}>
            Save reason
          </Button>
        </form>
      )}
    </div>
  )
}

function DeleteTaskDialog({ open, task, onCancel, onDeleted, projectId }) {
  const deleteTask = useDeleteTask(projectId)
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
          <Button variant="danger" loading={deleteTask.isPending} onClick={() => deleteTask.mutate(task.id, { onSuccess: onDeleted })}>
            Delete task
          </Button>
        </>
      }
    >
      <p className="text-base">
        “{task.title}” will be removed from the board for everyone in the project. This cannot be undone.
      </p>
      {deleteTask.isError && (
        <p role="alert" className="mt-3 text-base text-blocked">
          {errorMessage(deleteTask.error)}
        </p>
      )}
    </Dialog>
  )
}

function TaskView({ task, usernames, onEdit, onDelete, onMove }) {
  const { canEdit, canMove, canDelete } = task.permissions
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-surface px-3 text-sm font-medium text-heading">
          <StatusIcon status={task.status} />
          {statusLabel(task.status)}
        </span>
        {canMove && (
          <Menu
            label="Move to"
            align="left"
            buttonContent={<span>Move to…</span>}
            buttonClassName="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-base font-medium text-heading hover:bg-surface"
            items={moveMenuItems(task, onMove)}
          />
        )}
        <div className="ml-auto flex gap-2">
          {canEdit && (
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Menu
              label="More actions"
              buttonContent={<MoreIcon />}
              buttonClassName="inline-flex size-11 items-center justify-center rounded-lg border border-line text-heading hover:bg-surface"
              items={[{ key: 'delete', label: 'Delete task', danger: true, onSelect: onDelete }]}
            />
          )}
        </div>
      </div>

      {!canEdit && (
        <Notice>You can view this task but not change it. Ask the project owner for edit access.</Notice>
      )}

      {task.status === 'IN_PROGRESS' && canEdit && <BlockedControl key={task.blockedReason ?? ''} task={task} />}
      {task.isBlocked && !canEdit && (
        <Notice tone="warning">
          <strong className="font-semibold">Blocked</strong>
          {task.blockedReason ? `: ${task.blockedReason}` : ''}
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-line p-4">
        <div className="col-span-2">
          <Detail label="Assignees">{task.assigneeIds.map((id) => `@${usernames.get(id) ?? 'unknown'}`).join(', ')}</Detail>
        </div>
        <Detail label="Priority">{task.priority ? <PriorityBadge priority={task.priority} /> : 'No priority'}</Detail>
        <Detail label="Due date">{task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}</Detail>
      </dl>

      <div>
        <h3 className="text-base font-semibold text-heading">Description</h3>
        <p className="mt-1 whitespace-pre-line text-base">{task.description || 'No description yet.'}</p>
      </div>
    </div>
  )
}

function TaskEditForm({ task, members, onDone }) {
  const updateTask = useUpdateTask()
  const toast = useToast()
  const [values, setValues] = useState(() => taskValues(task))

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
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-base text-muted">Status changes through Move to, not this form.</p>
      <TaskFields values={values} onChange={setValues} members={members} error={updateTask.error} />
      {updateTask.isError && !updateTask.error.fieldErrors?.length && (
        <p role="alert" className="text-base text-blocked">
          {errorMessage(updateTask.error)}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={updateTask.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

function TaskDrawerBody({ taskId, projectId, members, usernames, onClose, onMove }) {
  const task = useTask(taskId)
  const [mode, setMode] = useState('view')
  const toast = useToast()
  const data = task.data

  if (task.isPending) return <LoadingState label="Loading task" />
  if (task.isError) return <ErrorState title="This task could not be opened" message={errorMessage(task.error)} />

  return (
    <>
      {mode === 'edit' ? (
        <TaskEditForm task={data} members={members} onDone={() => setMode('view')} />
      ) : (
        <TaskView
          task={data}
          usernames={usernames}
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
        onDeleted={() => {
          toast(`“${data.title}” was deleted.`)
          onClose()
        }}
      />
    </>
  )
}

// US-14, US-15, US-17 and US-18 in one right-side drawer (full screen on mobile).
// The body is keyed by task so a newly opened task always starts in view mode.
export default function TaskDrawer({ taskId, onClose, ...props }) {
  const cached = useTask(taskId)
  return (
    <Dialog open={Boolean(taskId)} onClose={onClose} variant="drawer" title={cached.data?.title ?? 'Task details'}>
      {taskId && <TaskDrawerBody key={taskId} taskId={taskId} onClose={onClose} {...props} />}
    </Dialog>
  )
}
