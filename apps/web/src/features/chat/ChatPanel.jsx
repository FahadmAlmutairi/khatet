import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useMe, useMessages, useSendMessage } from '../../api/hooks.js'
import Avatar from '../../components/Avatar.jsx'
import { ChatIcon, CloseIcon, SendIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import { FieldError } from '../../components/ui/Field.jsx'
import { ErrorState, LoadingState, Notice } from '../../components/ui/States.jsx'

const MAX_MESSAGE_LENGTH = 2000

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayTimeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const fullFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' })

// Today's messages show only the time; older ones add the day.
function messageTime(value, now = new Date()) {
  const date = new Date(value)
  return date.toDateString() === now.toDateString() ? timeFormat.format(date) : dayTimeFormat.format(date)
}

function ChatMessage({ message, mine }) {
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
        <p className="mt-0.5 text-sm whitespace-pre-wrap text-body [overflow-wrap:anywhere]">{message.text}</p>
      </div>
    </li>
  )
}

// Enter sends, Shift+Enter starts a new line (US-24).
function Composer({ projectId, inputRef, onSent }) {
  const send = useSendMessage(projectId)
  const [text, setText] = useState('')
  const [emptyError, setEmptyError] = useState(false)
  const errorId = useId()
  const inputId = useId()

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
    send.mutate(text, {
      onSuccess: () => {
        setText('')
        onSent()
      },
    })
  }

  return (
    <form onSubmit={submit} noValidate className="border-t border-line bg-white p-3 sm:p-4">
      <label htmlFor={inputId} className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          id={inputId}
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Write a message"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setText(event.target.value)
            if (emptyError) setEmptyError(false)
            if (send.isError) send.reset()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event)
          }}
          className="max-h-32 min-h-11 w-full resize-none rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-body placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked"
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
      <p className="mt-1.5 hidden text-xs text-muted lg:block">Enter to send, Shift+Enter for a new line.</p>
    </form>
  )
}

// US-24: the project chat. A right-hand panel on desktop and the full screen on phones
// (docs/ui-ux-guidelines.md, Project chat). Every member can read and send at every access level.
export default function ChatPanel({ project, open, onClose }) {
  const messages = useMessages(project.id, { enabled: open })
  const me = useMe()
  const titleId = useId()
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const stickToBottom = useRef(true)

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
          <ol role="log" aria-label="Messages" className="flex flex-col gap-4">
            {messages.data.map((message) => (
              <ChatMessage key={message.id} message={message} mine={message.authorId === me.data?.id} />
            ))}
          </ol>
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
        inputRef={inputRef}
        onSent={() => {
          stickToBottom.current = true
        }}
      />
    </aside>
  )
}
