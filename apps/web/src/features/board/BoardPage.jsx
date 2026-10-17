import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import { useMembers, useMoveTask, useTasks, useUpdateTask } from '../../api/hooks.js'
import { PlusIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import { BoardSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState, Notice, StateBadge } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { statusLabel } from '../../lib/domain.js'
import { rememberCardPositions } from '../../lib/motion.js'
import BoardColumns from './BoardColumns.jsx'
import CreateTaskDialog from './CreateTaskDialog.jsx'
import TaskDetails from './TaskDetails.jsx'

function accessNote(project) {
  if (project.role === 'OWNER' || project.taskAccess === 'EDIT_ALL') return null
  if (project.taskAccess === 'EDIT_ASSIGNED') {
    return { label: 'Your tasks only', text: 'You can edit and move only the tasks assigned to you.' }
  }
  return { label: 'View only', text: 'You can view tasks but not change them. Ask the project owner for edit access.' }
}

// US-21: tasks grouped by status, with Backlog kept apart under the lanes (Figma 324:778).
export default function BoardPage() {
  const { project } = useOutletContext()
  const tasks = useTasks(project.id)
  const members = useMembers(project.id)
  const moveTask = useMoveTask(project.id)
  const updateTask = useUpdateTask()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const openTaskId = searchParams.get('task')
  const crumbs = useBreadcrumb()
  useDocumentTitle('Board', project.name)

  const usernames = useMemo(
    () => new Map((members.data?.members ?? []).map((member) => [member.userId, member.username])),
    [members.data],
  )

  function openTask(taskId) {
    setSearchParams({ task: taskId })
  }

  function closeTask() {
    const taskId = openTaskId
    setSearchParams({}, { replace: true })
    // G11: if the control that opened the task is gone (a menu item), focus returns to its card.
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) return
      document.querySelector(`[data-task-id="${taskId}"] h3 button`)?.focus()
    }, 0)
  }

  // A drag already shows where the card goes, so only other moves get the glide.
  function move(task, status, position, { dragged = false, quiet = false, restoreBlocked = null } = {}) {
    if (!dragged) rememberCardPositions()
    const target = (tasks.data ?? []).filter((item) => item.status === status && item.id !== task.id)
    moveTask.mutate(
      { taskId: task.id, status, position: position ?? target.length + 1 },
      {
        onSuccess: () => {
          // Leaving In Progress clears the Blocked flag, so Undo sets it and its reason again.
          if (restoreBlocked) {
            updateTask.mutate(
              { taskId: task.id, patch: restoreBlocked },
              { onError: (error) => toast(`The Blocked flag on “${task.title}” could not be restored. ${errorMessage(error)}`, 'error') },
            )
          }
          if (quiet || status === task.status) return
          // Undo puts the card back in its old column and place.
          toast(`“${task.title}” moved to ${statusLabel(status)}.`, 'info', {
            onUndo: () =>
              move({ ...task, status }, task.status, task.position, {
                quiet: true,
                restoreBlocked: task.isBlocked ? { isBlocked: true, blockedReason: task.blockedReason } : null,
              }),
          })
        },
        onError: (error) =>
          toast(`“${task.title}” could not be moved and is back in its place. ${errorMessage(error)}`, 'error'),
      },
    )
  }

  const note = accessNote(project)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Breadcrumb items={crumbs} className="lg:hidden" />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title font-bold break-words text-body">{project.name}</h1>
            {note && <StateBadge label={note.label}>{note.text}</StateBadge>}
          </div>
        </div>
        {project.permissions.canCreateTask && (
          <Button onClick={() => setCreating(true)} disabled={!members.data} className="gap-1.5">
            <PlusIcon />
            Add task
          </Button>
        )}
      </div>

      <div>
        {(tasks.isPending || members.isPending) && <BoardSkeleton />}
        {tasks.isError && (
          <ErrorState title="The board could not be loaded" message={errorMessage(tasks.error)} onRetry={() => tasks.refetch()} />
        )}
        {/* The project exists and you are in it, but nobody has added a task yet. The empty lanes stay below. */}
        {tasks.data?.length === 0 && members.data && (
          <div className="mb-4">
            <Notice>
              <p className="font-semibold">This project has no tasks yet.</p>
              <p className="mt-1">
                {project.permissions.canCreateTask
                  ? 'Add the first task to start the board.'
                  : 'Tasks appear here when the project owner or a member with Edit all tasks access adds them.'}
              </p>
            </Notice>
          </div>
        )}
        {tasks.data && members.data && (
          <BoardColumns
            tasks={tasks.data}
            usernames={usernames}
            onOpen={openTask}
            onMove={move}
            onCreate={project.permissions.canCreateTask ? () => setCreating(true) : undefined}
          />
        )}
      </div>

      {members.data && (
        <>
          <CreateTaskDialog
            open={creating}
            onClose={() => setCreating(false)}
            projectId={project.id}
            members={members.data.members}
            onCreated={(task) => toast(`“${task.title}” was added to To Do.`)}
          />
          <TaskDetails
            projectName={project.name}
            taskId={openTaskId}
            projectId={project.id}
            members={members.data.members}
            usernames={usernames}
            onClose={closeTask}
            onMove={move}
          />
        </>
      )}
    </section>
  )
}
