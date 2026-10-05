import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useMembers, useMoveTask, useTasks } from '../../api/hooks.js'
import { PlusIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import { ErrorState, LoadingState, Notice } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { statusLabel } from '../../lib/domain.js'
import BoardColumns from './BoardColumns.jsx'
import CreateTaskDialog from './CreateTaskDialog.jsx'
import TaskDrawer from './TaskDrawer.jsx'

function accessNote(project) {
  if (project.role === 'OWNER' || project.taskAccess === 'EDIT_ALL') return null
  if (project.taskAccess === 'EDIT_ASSIGNED') return 'You can edit and move only the tasks assigned to you.'
  return 'You can view tasks but not change them. Ask the project owner for edit access.'
}

// US-21: tasks grouped by status, with Backlog kept apart from active work.
export default function BoardPage() {
  const { project } = useOutletContext()
  const tasks = useTasks(project.id)
  const members = useMembers(project.id)
  const moveTask = useMoveTask(project.id)
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const openTaskId = searchParams.get('task')

  const usernames = useMemo(
    () => new Map((members.data?.members ?? []).map((member) => [member.userId, member.username])),
    [members.data],
  )

  function openTask(taskId) {
    setSearchParams({ task: taskId })
  }

  function closeTask() {
    setSearchParams({}, { replace: true })
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
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Board</p>
          <h1 className="text-3xl font-semibold text-heading">{project.name}</h1>
        </div>
        {project.permissions.canCreateTask && (
          <Button onClick={() => setCreating(true)} disabled={!members.data}>
            <PlusIcon />
            Add task
          </Button>
        )}
      </div>
      {note && (
        <div className="mt-4 max-w-2xl">
          <Notice>{note}</Notice>
        </div>
      )}

      <div className="mt-6">
        {(tasks.isPending || members.isPending) && <LoadingState label="Loading the board" />}
        {tasks.isError && (
          <ErrorState title="The board could not be loaded" message={errorMessage(tasks.error)} onRetry={() => tasks.refetch()} />
        )}
        {tasks.data && members.data && (
          <BoardColumns tasks={tasks.data} usernames={usernames} onOpen={openTask} onMove={move} />
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
          <TaskDrawer
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
