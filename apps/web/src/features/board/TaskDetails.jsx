import { useId, useState } from 'react'
import { errorMessage } from '../../api/errors.js'
import { useDeleteTask, useTask, useUpdateTask } from '../../api/hooks.js'
import { AvatarStack } from '../../components/Avatar.jsx'
import { ChevronIcon, CloseIcon, MoreIcon } from '../../components/icons.jsx'
import PriorityBadge from '../../components/PriorityBadge.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import Menu from '../../components/ui/Menu.jsx'
import { ErrorState, LoadingState, Notice } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { dueLine, formatDueDate, statusLabel } from '../../lib/domain.js'
import { moveMenuItems } from './moveMenu.jsx'
import TaskFields from './TaskFields.jsx'
import { taskValues } from './taskValues.js'

// Colours of the Figma "Status Badge" component.
const STATUS_TONES = {
  BACKLOG: 'bg-[#ecefec] text-[#4e5650]',
  TODO: 'bg-[#ecefec] text-[#4e5650]',
  IN_PROGRESS: 'bg-[#d4faf4] text-[#17665b]',
  READY_FOR_REVIEW: 'bg-[#fff1cc] text-[#7a5310]',
  DONE: 'bg-[#d9f2df] text-[#246b3a]',
}

const outlineButton =
  'inline-flex h-11 items-center justify-center rounded-[9px] border border-line bg-white text-[13px] font-medium text-heading hover:bg-surface lg:h-10'

function TopBar({ eyebrow, children, onClose }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-medium whitespace-pre text-muted uppercase">{eyebrow}</p>
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
      <span className={`inline-flex h-9 w-fit items-center gap-1.5 rounded-full px-3 text-sm font-medium ${tone}`}>
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
      buttonClassName={`inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium lg:h-9 ${tone}`}
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
  const id = useId()

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
    <div className="flex flex-col gap-3 rounded-[14px] border border-line p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-0.5">
          <p id={`${id}-label`} className="text-base font-medium text-body">
            Blocked
          </p>
          <p className="text-sm leading-5 text-muted">Only for tasks in progress. The card shows a Blocked label.</p>
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
            save(true)
          }}
        >
          <label htmlFor={`${id}-reason`} className="text-xs font-medium text-body">
            Reason (optional)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`${id}-reason`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-11 w-full rounded-lg border border-surface-supporting bg-white px-3 text-sm text-body sm:flex-1"
            />
            <button
              type="submit"
              disabled={reason === (task.blockedReason ?? '') || updateTask.isPending}
              className={`${outlineButton} px-4 disabled:text-muted lg:h-11`}
            >
              Save reason
            </button>
          </div>
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
        <StatusControl task={task} onMove={onMove} />
      </div>

      {!canEdit && (
        <Notice>You can view this task but not change it. Ask the project owner for edit access.</Notice>
      )}

      <dl className="flex flex-col gap-4 rounded-[14px] border border-line p-4 sm:flex-row sm:gap-6">
        <Detail label="Assignees">
          <AvatarStack users={assignees} />
          <span className="min-w-0">{assignees.map((user) => `@${user.username}`).join(', ')}</span>
        </Detail>
        <Detail label="Priority">{task.priority ? <PriorityBadge priority={task.priority} /> : 'No priority'}</Detail>
        <Detail label="Due date">
          <span className={due.overdue ? 'text-attention' : ''}>
            {task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}
            {due.overdue && <span className="sr-only">, overdue</span>}
          </span>
        </Detail>
      </dl>

      {task.status === 'IN_PROGRESS' && canEdit && <BlockedControl key={task.blockedReason ?? ''} task={task} />}
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

function TaskEditForm({ task, titleId, eyebrow, members, onClose, onDone }) {
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
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <TopBar eyebrow={eyebrow} onClose={onClose} />
      <h2 id={titleId} className="text-xl leading-[30px] font-bold text-body sm:text-2xl">
        Edit task
      </h2>
      <TaskFields values={values} onChange={setValues} members={members} error={updateTask.error} />
      {updateTask.isError && !updateTask.error.fieldErrors?.length && (
        <p role="alert" className="text-sm text-blocked">
          {errorMessage(updateTask.error)}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className={`${outlineButton} px-[18px] lg:h-11`}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={updateTask.isPending}
          className="inline-flex h-11 items-center justify-center rounded-[9px] bg-action px-[18px] text-[13px] font-medium text-white hover:bg-heading disabled:opacity-60"
        >
          Save changes
        </button>
      </div>
    </form>
  )
}

function TaskDetailsBody({ taskId, titleId, projectId, projectName, members, usernames, onClose, onMove }) {
  const task = useTask(taskId)
  const [mode, setMode] = useState('view')
  const toast = useToast()
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
        onDeleted={() => {
          toast(`“${data.title}” was deleted.`)
          onClose()
        }}
      />
    </>
  )
}

// US-14, US-15, US-16, US-17 and US-18 in a centred mini page (Figma: Task Details / Modal).
// The right side stays free for project chat. The body is keyed by task so a newly
// opened task always starts in view mode.
export default function TaskDetails({ taskId, onClose, ...props }) {
  const titleId = useId()
  return (
    <Dialog open={Boolean(taskId)} onClose={onClose} variant="panel" labelledBy={titleId}>
      {taskId && <TaskDetailsBody key={taskId} taskId={taskId} titleId={titleId} onClose={onClose} {...props} />}
    </Dialog>
  )
}
