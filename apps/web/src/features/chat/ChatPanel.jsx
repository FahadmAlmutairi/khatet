import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useMe, useMessages, useSendMessage, useTasks } from '../../api/hooks.js'
import Avatar from '../../components/Avatar.jsx'
import { ChatIcon, CloseIcon, SendIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import { FieldError } from '../../components/ui/Field.jsx'
import { ErrorState, LoadingState, Notice } from '../../components/ui/States.jsx'
import { COVERS_PAGE_QUERY, inertOthers } from '../../lib/inertOthers.js'
import { encodeReferences, mentionAt, splitMessage } from './taskRefs.js'

const MAX_MESSAGE_LENGTH = 2000

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayTimeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const fullFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' })

// Today's messages show only the time; older ones add the day.
function messageTime(value, now = new Date()) {
  const date = new Date(value)
  return date.toDateString() === now.toDateString() ? timeFormat.format(date) : dayTimeFormat.format(date)
}

const MAX_SUGGESTIONS = 6

// US-25: a mentioned task shows as a chip with its current title; clicking it opens the task.
// The API sends each title with the message; the board's own task list is the fallback.
function TaskChip({ taskId, message, taskTitles, onOpenTask }) {
  const reference = message.references?.find((item) => item.taskId === taskId)
  const title = reference ? reference.title : taskTitles?.get(taskId)
  const deleted = reference ? reference.title === null : taskTitles ? !taskTitles.has(taskId) : false
  if (deleted) {
    return <span className="mx-0.5 inline-flex items-center rounded-md bg-surface-subtle px-1.5 text-muted italic">Deleted task</span>
  }
  return (
    <button
      type="button"
      onClick={() => onOpenTask(taskId)}
      aria-label={`Open task ${title ?? ''}`.trim()}
      className="mx-0.5 inline rounded-md bg-nav-active px-1.5 py-px text-left font-medium text-heading underline-offset-2 hover:underline focus-visible:underline"
    >
      <span aria-hidden="true" className="text-muted">#</span>
      {title ?? 'Task'}
    </button>
  )
}

function MessageText({ message, taskTitles, onOpenTask }) {
  return splitMessage(message.text).map((part, index) =>
    part.type === 'text' ? (
      part.text
    ) : (
      <TaskChip key={index} taskId={part.taskId} message={message} taskTitles={taskTitles} onOpenTask={onOpenTask} />
    ),
  )
}

function ChatMessage({ message, mine, taskTitles, onOpenTask }) {
  return (
    <li className="flex items-start gap-2.5">
      <Avatar username={message.authorUsername} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold text-heading">
            {message.authorUsername}
            {mine && <span className="font-normal text-muted"> (you)</span>}
          </span>
          <time dateTime={message.createdAt} title={fullFormat.format(new Date(message.createdAt))} className="text-xs text-muted">
            {messageTime(message.createdAt)}
          </time>
        </p>
        <p className="mt-0.5 text-sm whitespace-pre-wrap text-body [overflow-wrap:anywhere]">
          <MessageText message={message} taskTitles={taskTitles} onOpenTask={onOpenTask} />
        </p>
      </div>
    </li>
  )
}

// Enter sends, Shift+Enter starts a new line (US-24). Typing # lists the project's tasks by
// title; picking one puts "#Title" in the box, which is sent as a task link (US-25).
function Composer({ projectId, tasks, inputRef, onSent }) {
  const send = useSendMessage(projectId)
  const [text, setText] = useState('')
  const [emptyError, setEmptyError] = useState(false)
  const [references, setReferences] = useState([])
  const [mention, setMention] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const caretAfterPick = useRef(null)
  const errorId = useId()
  const inputId = useId()
  const listId = useId()

  const suggestions = useMemo(() => {
    if (!mention || !tasks) return []
    const query = mention.query.trim().toLocaleLowerCase()
    return tasks.filter((task) => task.title.toLocaleLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS)
  }, [mention, tasks])
  const listOpen = Boolean(mention) && suggestions.length > 0

  useLayoutEffect(() => {
    if (caretAfterPick.current === null || !inputRef.current) return
    inputRef.current.setSelectionRange(caretAfterPick.current, caretAfterPick.current)
    caretAfterPick.current = null
  }, [text, inputRef])

  function updateMention(value, caret) {
    let next = mentionAt(value, caret)
    // Right after a pick the caret follows "#Title ", which is not a new search.
    if (next && references.some((item) => next.query.startsWith(item.label))) next = null
    setMention(next)
    if (next?.query !== mention?.query) setActiveIndex(0)
  }

  function pick(task) {
    const label = task.title
    const before = text.slice(0, mention.start)
    const after = text.slice(inputRef.current?.selectionStart ?? text.length)
    const inserted = `#${label} `
    setText(before + inserted + after)
    setReferences((current) => [...current.filter((item) => item.label !== label), { label, taskId: task.id }])
    caretAfterPick.current = before.length + inserted.length
    setMention(null)
    inputRef.current?.focus()
  }

  const serverError = send.isError ? (fieldError(send.error, 'text') ?? errorMessage(send.error)) : null
  const error = emptyError ? 'Write a message first.' : serverError

  function submit(event) {
    event?.preventDefault()
    if (send.isPending) return
    if (!text.trim()) {
      setEmptyError(true)
      inputRef.current?.focus()
      return
    }
    send.mutate(encodeReferences(text, references), {
      onSuccess: () => {
        setText('')
        setReferences([])
        setMention(null)
        onSent()
      },
    })
  }

  return (
    <form onSubmit={submit} noValidate className="border-t border-line bg-white p-3 sm:p-4">
      <label htmlFor={inputId} className="sr-only">
        Message
      </label>
      <div className="relative flex items-end gap-2">
        {listOpen && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Tasks to mention"
            className="absolute right-0 bottom-full left-0 z-10 mb-2 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_24px_rgba(38,54,41,0.16)]"
          >
            {suggestions.map((task, index) => (
              <li
                key={task.id}
                id={`${listId}-${task.id}`}
                role="option"
                aria-selected={index === activeIndex}
                // mousedown, not click, so the message box keeps focus and its caret.
                onMouseDown={(event) => {
                  event.preventDefault()
                  pick(task)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex min-h-11 cursor-pointer items-center rounded-lg px-2.5 text-sm text-body ${index === activeIndex ? 'bg-nav-active' : ''}`}
              >
                <span className="truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={inputRef}
          id={inputId}
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Write a message"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={listOpen ? `${listId}-${suggestions[activeIndex]?.id}` : undefined}
          onChange={(event) => {
            setText(event.target.value)
            updateMention(event.target.value, event.target.selectionStart)
            if (emptyError) setEmptyError(false)
            if (send.isError) send.reset()
          }}
          onSelect={(event) => updateMention(event.currentTarget.value, event.currentTarget.selectionStart)}
          onBlur={() => setMention(null)}
          onKeyDown={(event) => {
            if (listOpen) {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                const step = event.key === 'ArrowDown' ? 1 : -1
                setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length)
                return
              }
              if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                pick(suggestions[activeIndex])
                return
              }
              if (event.key === 'Escape') {
                // Closes the list only; a second Esc closes the chat.
                event.stopPropagation()
                setMention(null)
                return
              }
            }
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
          }}
          className="max-h-32 min-h-11 w-full resize-none rounded-lg border border-input bg-white px-3 py-2.5 text-base sm:text-sm text-body placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked"
        />
        <Button type="submit" size="icon" loading={send.isPending} aria-label="Send message">
          {!send.isPending && <SendIcon />}
        </Button>
      </div>
      {error && (
        <div className="mt-2">
          <FieldError id={errorId} role="alert">
            {error}
          </FieldError>
        </div>
      )}
      <p className="mt-1.5 hidden text-xs text-muted lg:block">Enter to send, Shift+Enter for a new line, # to mention a task.</p>
    </form>
  )
}

// US-24: the project chat. A right-hand panel on desktop and the full screen on phones
// (docs/ui-ux-guidelines.md, Project chat). Every member can read and send at every access level.
export default function ChatPanel({ project, open, onClose, onOpenTask }) {
  const messages = useMessages(project.id, { enabled: open })
  const me = useMe()
  // The board already loads every task of the project; the chat reuses that list (US-25).
  const tasks = useTasks(project.id)
  const taskTitles = useMemo(() => (tasks.data ? new Map(tasks.data.map((task) => [task.id, task.title])) : null), [tasks.data])
  const titleId = useId()
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const stickToBottom = useRef(true)
  const panelRef = useRef(null)
  // On a phone the chat covers the whole page, so it acts as a modal dialog there: the page behind
  // is inert until it closes (review M10). On a desktop it sits beside the board, which stays usable.
  const [coversPage, setCoversPage] = useState(() => window.matchMedia?.(COVERS_PAGE_QUERY).matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.(COVERS_PAGE_QUERY)
    if (!query) return undefined
    const onChange = () => setCoversPage(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  useEffect(() => {
    if (!open || !coversPage || !panelRef.current) return undefined
    return inertOthers(panelRef.current)
  }, [open, coversPage])

  // Opening the chat puts the cursor in the message box.
  useEffect(() => {
    if (open) {
      stickToBottom.current = true
      inputRef.current?.focus()
    }
  }, [open])

  // New messages scroll into view, unless the reader has scrolled up to older ones.
  const count = messages.data?.length ?? 0
  useLayoutEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [count, open])

  if (!open) return null

  function onScroll() {
    const list = listRef.current
    stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48
  }

  return (
    <aside
      ref={panelRef}
      role={coversPage ? 'dialog' : undefined}
      aria-modal={coversPage ? 'true' : undefined}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
      className="fixed inset-0 z-50 flex flex-col bg-surface lg:inset-y-0 lg:right-0 lg:left-auto lg:z-40 lg:w-[380px] lg:border-l lg:border-line lg:shadow-[-8px_0_24px_rgba(20,31,23,0.08)]"
    >
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-nav-active text-heading">
          <ChatIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold text-heading">
            Project chat
          </h2>
          <p className="truncate text-xs text-muted">{project.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-heading hover:bg-surface lg:size-9"
        >
          <CloseIcon />
        </button>
      </header>

      <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.isPending && <LoadingState label="Loading messages" />}
        {messages.isError && !messages.data && (
          <ErrorState title="The chat could not be loaded" message={errorMessage(messages.error)} onRetry={() => messages.refetch()} />
        )}
        {messages.data?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-base font-semibold text-heading">No messages yet</p>
            <p className="text-sm text-muted">Send the first message to your team. Everyone in the project can read it.</p>
          </div>
        )}
        {messages.data?.length > 0 && (
          <div role="log" aria-label="Messages">
            <ol className="flex flex-col gap-4">
              {messages.data.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  mine={message.authorId === me.data?.id}
                  taskTitles={taskTitles}
                  onOpenTask={onOpenTask}
                />
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* A refresh failed after messages were shown: keep them and say new ones may be late. */}
      {messages.isRefetchError && messages.data && (
        <div className="px-4 pb-2">
          <Notice tone="warning">New messages could not be loaded. Khatet keeps trying.</Notice>
        </div>
      )}

      <Composer
        projectId={project.id}
        tasks={tasks.data}
        inputRef={inputRef}
        onSent={() => {
          stickToBottom.current = true
        }}
      />
    </aside>
  )
}
