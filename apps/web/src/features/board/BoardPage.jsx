import { useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import { useMe, useMembers, useMoveTask, useTasks, useUpdateTask } from '../../api/hooks.js'
import { PlusIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import { BoardSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState, StateBadge } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { statusLabel } from '../../lib/domain.js'
import { rememberCardPositions } from '../../lib/motion.js'
import BoardColumns from './BoardColumns.jsx'
import CreateTaskDialog from './CreateTaskDialog.jsx'
import FilterBar from './FilterBar.jsx'
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
  const me = useMe()
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

  const filters = useMemo(
    () => ({
      assignee: new Set(searchParams.getAll('assignee')),
      status: new Set(searchParams.getAll('status')),
      priority: new Set(searchParams.getAll('priority')),
    }),
    [searchParams],
  )
  const hasFilters = filters.assignee.size > 0 || filters.status.size > 0 || filters.priority.size > 0
  const filteredTasks = useMemo(() => {
    if (!tasks.data) return []
    return tasks.data.filter(
      (task) =>
        (!filters.assignee.size || task.assigneeIds.some((id) => filters.assignee.has(id))) &&
        (!filters.status.size || filters.status.has(task.status)) &&
        (!filters.priority.size || (task.priority && filters.priority.has(task.priority))),
    )
  }, [filters, tasks.data])

  function updateFilters(nextFilters) {
    const next = new URLSearchParams(searchParams)
    for (const key of ['assignee', 'status', 'priority']) {
      next.delete(key)
      for (const value of nextFilters[key]) next.append(key, value)
    }
    setSearchParams(next)
  }

  function toggleFilter(type, value) {
    const next = {
      assignee: new Set(filters.assignee),
      status: new Set(filters.status),
      priority: new Set(filters.priority),
    }
    if (next[type].has(value)) next[type].delete(value)
    else next[type].add(value)
    updateFilters(next)
  }

  function clearFilters() {
    updateFilters({ assignee: new Set(), status: new Set(), priority: new Set() })
  }

  function openTask(taskId) {
    const next = new URLSearchParams(searchParams)
    next.set('task', taskId)
    setSearchParams(next)
  }

  function closeTask() {
    const taskId = openTaskId
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true })
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
        {tasks.data && members.data && (
          <div className="flex flex-col gap-5">
            <FilterBar
              members={members.data.members}
              currentUserId={me.data?.id}
              filters={filters}
              onToggle={toggleFilter}
              onClear={clearFilters}
            />
            {hasFilters && filteredTasks.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface p-8 text-center">
                <p className="text-body">No tasks match these filters</p>
                <Button variant="secondary" onClick={clearFilters} className="mt-4">
                  Clear filters
                </Button>
              </div>
            ) : (
              <BoardColumns
                tasks={filteredTasks}
                usernames={usernames}
                onOpen={openTask}
                onMove={move}
                onCreate={project.permissions.canCreateTask ? () => setCreating(true) : undefined}
              />
            )}
          </div>
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
