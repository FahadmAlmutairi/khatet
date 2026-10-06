import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import { useMembers, useMoveTask, useTasks } from '../../api/hooks.js'
import { PlusIcon } from '../../components/icons.jsx'
import { BoardSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState, StateBadge } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { statusLabel } from '../../lib/domain.js'
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

  function move(task, status, position) {
    const target = (tasks.data ?? []).filter((item) => item.status === status && item.id !== task.id)
    moveTask.mutate(
      { taskId: task.id, status, position: position ?? target.length + 1 },
      {
        onSuccess: () => {
          if (status !== task.status) toast(`“${task.title}” moved to ${statusLabel(status)}.`)
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
            <h1 className="text-[28px] leading-[34px] font-bold break-words text-body">{project.name}</h1>
            {note && <StateBadge label={note.label}>{note.text}</StateBadge>}
          </div>
        </div>
        {project.permissions.canCreateTask && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={!members.data}
            className="inline-flex items-center justify-center gap-1.5 rounded-[9px] bg-action px-[18px] py-[13px] text-[13px] leading-[18px] font-medium text-white hover:bg-heading disabled:opacity-60"
          >
            <PlusIcon />
            Add task
          </button>
        )}
      </div>

      <div>
        {(tasks.isPending || members.isPending) && <BoardSkeleton />}
        {tasks.isError && (
          <ErrorState title="The board could not be loaded" message={errorMessage(tasks.error)} onRetry={() => tasks.refetch()} />
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
