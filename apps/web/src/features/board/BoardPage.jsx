import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import { useMe, useMembers, useMoveTask, useTasks, useUpdateTask } from '../../api/hooks.js'
import { ChatIcon, PlusIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import { BoardSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState, Notice, StateBadge } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { statusLabel } from '../../lib/domain.js'
import { rememberCardPositions } from '../../lib/motion.js'
import ChatPanel from '../chat/ChatPanel.jsx'
import InviteDialog from '../members/InviteDialog.jsx'
import BoardColumns from './BoardColumns.jsx'
import CreateTaskDialog from './CreateTaskDialog.jsx'
import FilterBar from './FilterBar.jsx'
import TaskDetails from './TaskDetails.jsx'
import ImportDialog from './import/ImportDialog.jsx'
import { importAvailable } from '../../api/config.js'
import { COVERS_PAGE_QUERY } from '../../lib/inertOthers.js'

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
  const [inviting, setInviting] = useState(false)
  const [importing, setImporting] = useState(false)
  // US-33: only the owner imports tasks from a CSV file.
  const canImport = importAvailable && project.role === 'OWNER'
  const [chatOpen, setChatOpen] = useState(false)
  const chatButtonRef = useRef(null)
  // A card moved from its menu lands in another lane as a new element, so focus goes back to it there (NFR-04).
  const focusAfterMove = useRef(null)
  const openTaskId = searchParams.get('task')
  useDocumentTitle('Board', project.name)

  const usernames = useMemo(
    () => new Map((members.data?.members ?? []).map((member) => [member.userId, member.username])),
    [members.data],
  )

  useEffect(() => {
    const pending = focusAfterMove.current
    if (!pending || tasks.data?.find((task) => task.id === pending.taskId)?.status !== pending.status) return
    focusAfterMove.current = null
    document.querySelector(`[data-task-id="${pending.taskId}"] h3 button`)?.focus()
  }, [tasks.data])

  const filters = useMemo(
    () => ({
      assignee: new Set(searchParams.getAll('assignee')),
      priority: new Set(searchParams.getAll('priority')),
    }),
    [searchParams],
  )
  // The board's columns already show the status, so there is no status filter (removed 17 Nov 2026).
  const hasFilters = filters.assignee.size > 0 || filters.priority.size > 0
  // US-23: the search text lives in the address (?q=) like the filters, so a reload keeps it.
  const search = searchParams.get('q') ?? ''
  const searchText = search.trim().toLocaleLowerCase()
  const filteredTasks = useMemo(() => {
    if (!tasks.data) return []
    return tasks.data.filter(
      (task) =>
        (!searchText || task.title.toLocaleLowerCase().includes(searchText)) &&
        (!filters.assignee.size || task.assigneeIds.some((id) => filters.assignee.has(id))) &&
        (!filters.priority.size || (task.priority && filters.priority.has(task.priority))),
    )
  }, [filters, searchText, tasks.data])

  function updateFilters(nextFilters) {
    const next = new URLSearchParams(searchParams)
    for (const key of ['assignee', 'priority']) {
      next.delete(key)
      for (const value of nextFilters[key]) next.append(key, value)
    }
    setSearchParams(next)
  }

  function toggleFilter(type, value) {
    const next = {
      assignee: new Set(filters.assignee),
      priority: new Set(filters.priority),
    }
    if (next[type].has(value)) next[type].delete(value)
    else next[type].add(value)
    updateFilters(next)
  }

  function clearFilters() {
    updateFilters({ assignee: new Set(), priority: new Set() })
  }

  function changeSearch(value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    // Each key press replaces the address, so Back leaves the board instead of undoing letters.
    setSearchParams(next, { replace: true })
  }

  function clearSearch() {
    changeSearch('')
    document.getElementById('task-search')?.focus()
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
    // In task details the status button keeps focus, so only moves from the board need this.
    if (!dragged && !openTaskId) focusAfterMove.current = { taskId: task.id, status }
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
        onError: (error) => {
          // The card goes back to its old lane, and focus follows it there.
          if (focusAfterMove.current?.taskId === task.id) focusAfterMove.current = { taskId: task.id, status: task.status }
          toast(`“${task.title}” could not be moved and is back in its place. ${errorMessage(error)}`, 'error')
        },
      },
    )
  }

  // Closing the chat returns focus to the button that opened it.
  function closeChat() {
    setChatOpen(false)
    setTimeout(() => chatButtonRef.current?.focus(), 0)
  }

  // US-25: a task link in chat opens the task. On a phone the chat covers the board, so it closes
  // first, without moving focus back to the chat button behind the task.
  function openTaskFromChat(taskId) {
    if (window.matchMedia?.(COVERS_PAGE_QUERY).matches) setChatOpen(false)
    openTask(taskId)
  }

  // US-25: "Reference in chat" in task details closes the task and opens the chat with the
  // task already in the message box.
  const [chatDraft, setChatDraft] = useState(null)
  function referenceInChat(task) {
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true })
    setChatDraft({ taskId: task.id, title: task.title })
    setChatOpen(true)
  }

  const note = accessNote(project)

  return (
    // On desktop the open chat sits on the right, so the board makes room for it.
    <section className={`flex flex-col gap-6 ${chatOpen ? 'lg:mr-[356px]' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title font-bold break-words text-body">{project.name}</h1>
            {note && <StateBadge label={note.label}>{note.text}</StateBadge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Every member can open the chat at every access level (US-24); it is one tap from the board (NFR-01). */}
          <Button
            ref={chatButtonRef}
            variant="secondary"
            onClick={() => (chatOpen ? closeChat() : setChatOpen(true))}
            aria-expanded={chatOpen}
            className="gap-1.5"
            data-tour="chat"
          >
            <ChatIcon />
            Project chat
          </Button>
          {/* Inviting from the board takes 3 taps on any screen, without opening the menu for Members (NFR-01). */}
          {project.permissions.canManageMembers && (
            <Button variant="secondary" onClick={() => setInviting(true)}>
              Invite member
            </Button>
          )}
          {canImport && (
            <Button variant="secondary" onClick={() => setImporting(true)}>
              Import tasks
            </Button>
          )}
          {project.permissions.canCreateTask && (
            <Button onClick={() => setCreating(true)} disabled={!members.data} className="gap-1.5">
              <PlusIcon />
              Add task
            </Button>
          )}
        </div>
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
          <div className="flex flex-col gap-5">
            <FilterBar
              members={members.data.members}
              currentUserId={me.data?.id}
              filters={filters}
              onToggle={toggleFilter}
              onClear={clearFilters}
              search={search}
              onSearchChange={changeSearch}
            />
            <p role="status" className="sr-only">
              {searchText || hasFilters ? `${filteredTasks.length} of ${tasks.data.length} tasks shown` : ''}
            </p>
            {searchText && filteredTasks.length === 0 && tasks.data.length > 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface p-8 text-center">
                <p className="text-body">No tasks match your search</p>
                <Button variant="secondary" onClick={clearSearch} className="mt-4">
                  Clear search
                </Button>
              </div>
            ) : hasFilters && filteredTasks.length === 0 && tasks.data.length > 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface p-8 text-center">
                <p className="text-body">No tasks match these filters</p>
                <Button variant="secondary" onClick={clearFilters} className="mt-4">
                  Clear filters
                </Button>
              </div>
            ) : (
              <BoardColumns
                tasks={filteredTasks}
                allTasks={tasks.data}
                usernames={usernames}
                onOpen={openTask}
                onMove={move}
                onCreate={project.permissions.canCreateTask ? () => setCreating(true) : undefined}
              />
            )}
          </div>
        )}
      </div>

      <ChatPanel
        project={project}
        open={chatOpen}
        onClose={closeChat}
        onOpenTask={openTaskFromChat}
        draftTask={chatDraft}
        onDraftUsed={() => setChatDraft(null)}
      />

      {canImport && <ImportDialog open={importing} onClose={() => setImporting(false)} projectId={project.id} />}

      {project.permissions.canManageMembers && (
        <InviteDialog open={inviting} onClose={() => setInviting(false)} projectId={project.id} backLabel="Board" />
      )}

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
            onReferenceInChat={referenceInChat}
          />
        </>
      )}
    </section>
  )
}
