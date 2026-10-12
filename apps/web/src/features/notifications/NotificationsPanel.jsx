import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useRespondToInvitation } from '../../api/hooks.js'
import { Spinner } from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { ArrowLeftIcon, MembersIcon, TaskCheckIcon } from '../../components/icons.jsx'
import { notificationTime } from '../../lib/domain.js'

// Figma: desktop "Notifications / Panel / Populated" (1035:1912) drops down under the bell;
// mobile "Notifications / Mobile / Populated" (741:2) fills the screen.
// States from "Notifications / Desktop / Supporting States" (305:673).

const smallButton = 'inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium lg:h-9 lg:px-[14px] lg:text-label'

export function InvitationActions({ notification }) {
  const respond = useRespondToInvitation()
  const toast = useToast()

  if (notification.invitationStatus !== 'PENDING') {
    return (
      <p data-motion="enter" className="text-sm text-muted lg:text-nav">
        {notification.invitationStatus === 'ACCEPTED' ? 'You joined this project.' : 'You declined this invitation.'}
      </p>
    )
  }

  function answer(accept) {
    respond.mutate(
      { invitationId: notification.invitationId, accept },
      {
        onSuccess: () =>
          toast(accept ? `You joined ${notification.projectName}.` : `You declined the invitation to ${notification.projectName}.`),
        onError: (error) => toast(errorMessage(error), 'error'),
      },
    )
  }

  const busy = respond.isPending
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => answer(true)}
        disabled={busy}
        aria-busy={(busy && respond.variables?.accept) || undefined}
        className={`${smallButton} gap-2 bg-action text-white hover:bg-heading disabled:cursor-not-allowed`}
      >
        {busy && respond.variables?.accept && <Spinner />}
        Accept
      </button>
      <button
        type="button"
        onClick={() => answer(false)}
        disabled={busy}
        className={`${smallButton} border border-line bg-white text-heading hover:bg-surface disabled:cursor-not-allowed disabled:text-muted`}
      >
        Decline
      </button>
    </div>
  )
}

function UnreadDot({ className }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-full bg-attention ${className}`} />
}

function NotificationItem({ notification, onOpenTask }) {
  const isInvitation = notification.type === 'INVITATION'
  const opensTask = !isInvitation && notification.taskTitle
  const title = isInvitation ? 'Project invitation' : 'Task assigned'
  const body = isInvitation
    ? `@${notification.actorUsername} invited you to join “${notification.projectName}”.`
    : notification.taskTitle
      ? `You were assigned to “${notification.taskTitle}” in ${notification.projectName}.`
      : `A task in ${notification.projectName} was assigned to you and has since been deleted.`
  const time = notificationTime(notification.createdAt)

  const copy = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-1.5">
          {!notification.read && <UnreadDot className="hidden size-[7px] lg:block" />}
          <span className={`text-sm leading-[17px] text-body ${notification.read ? 'font-medium' : 'font-bold'}`}>{title}</span>
          {!notification.read && <span className="sr-only">(unread)</span>}
        </span>
        <span className="hidden shrink-0 text-xs leading-[15px] text-nav lg:block">{time.short}</span>
      </span>
      <span className="block text-sm leading-[1.4] text-muted lg:text-nav">{body}</span>
      <span className="block text-xs whitespace-pre-wrap text-action lg:hidden">
        {time.long}
        {'  ·  '}
        {notification.projectName}
      </span>
    </>
  )

  return (
    <li
      className={`flex items-start gap-3 rounded-card border border-line bg-white p-[14px] lg:gap-[11px] lg:rounded-none lg:border-0 lg:border-b lg:px-[15px] lg:py-[14px] ${
        notification.read ? '' : 'lg:bg-[#f9fbf8]'
      }`}
    >
      {notification.read ? <span aria-hidden="true" className="size-2 shrink-0 lg:hidden" /> : <UnreadDot className="mt-1 size-2 lg:hidden" />}
      <span aria-hidden="true" className={`hidden size-9 shrink-0 items-center justify-center rounded-control bg-nav-active lg:flex ${isInvitation ? 'text-nav' : 'text-action'}`}>
        {isInvitation ? <MembersIcon /> : <TaskCheckIcon />}
      </span>
      <div className={`flex min-w-0 flex-1 flex-col ${isInvitation ? 'gap-[5px] lg:gap-1.5' : 'gap-[5px] lg:gap-1'}`}>
        {opensTask ? (
          <button type="button" onClick={() => onOpenTask(notification)} className="flex w-full flex-col gap-[5px] text-left lg:gap-1">
            {copy}
          </button>
        ) : (
          <div className="flex flex-col gap-[5px] lg:gap-1.5">{copy}</div>
        )}
        {isInvitation && <InvitationActions notification={notification} />}
      </div>
    </li>
  )
}

function PanelState({ role, title, children, action }) {
  return (
    <div role={role} className="flex min-h-[218px] flex-col items-center justify-center gap-2.5 px-7 py-6 text-center">
      {children}
      <p className="text-base font-semibold text-body">{title}</p>
      {action}
    </div>
  )
}

const stateText = 'max-w-[340px] text-sm text-muted lg:text-nav'
const stateButton = 'inline-flex h-11 items-center rounded-control px-[18px] text-label font-medium'

function CaughtUpBadge() {
  return (
    <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-nav-active text-xl font-semibold text-action">
      ✓
    </span>
  )
}

// N1: newest first, split into Today and Earlier by the viewer's local date.
function groupByDay(items) {
  const today = new Date().toDateString()
  const groups = [
    { key: 'today', label: 'Today', items: items.filter((item) => new Date(item.createdAt).toDateString() === today) },
    { key: 'earlier', label: 'Earlier', items: items.filter((item) => new Date(item.createdAt).toDateString() !== today) },
  ]
  return groups.filter((group) => group.items.length > 0)
}

export default function NotificationsPanel({ open, onClose, query }) {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const toast = useToast()
  const titleId = useId()
  const [filter, setFilter] = useState('ALL')

  function openTask(notification) {
    if (!notification.read) markRead.mutate(notification.id)
    onClose()
    navigate(`/projects/${notification.projectId}/board?task=${notification.taskId}`)
  }

  const items = query.data?.items ?? []
  const unread = query.data?.unreadCount ?? 0
  const shown = filter === 'UNREAD' ? items.filter((item) => !item.read) : items

  function markAllRead() {
    const ids = items.filter((item) => !item.read).map((item) => item.id)
    markAll.mutate(ids, { onError: (error) => toast(errorMessage(error), 'error') })
  }

  function tabClass(active) {
    return `inline-flex h-11 items-center justify-center rounded-[10px] border text-label lg:h-7 lg:w-auto lg:rounded-lg lg:border-0 lg:px-[14px] ${
      active
        ? 'border-action bg-action text-white lg:bg-white lg:font-semibold lg:text-body'
        : 'border-line bg-white text-body lg:bg-transparent lg:text-muted'
    }`
  }

  return (
    <Dialog open={open} onClose={onClose} variant="popover" labelledBy={titleId}>
      <div className="flex min-h-full flex-col lg:min-h-0">
        <div className="flex h-16 shrink-0 items-center bg-white px-5 lg:hidden">
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-action">
            <ArrowLeftIcon />
            Back
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-5 py-[18px] lg:gap-0 lg:p-0">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center lg:border-b lg:border-line lg:bg-white lg:px-[18px] lg:pt-[18px] lg:pb-[14px]">
            <h2 id={titleId} className="flex items-center gap-[7px] text-[26px] font-bold text-body lg:col-start-1 lg:row-start-1 lg:text-[17px] lg:font-semibold">
              Notifications
              {unread > 0 && (
                <span className="hidden rounded-full bg-[#f5dbcf] px-[7px] py-0.5 text-xs font-semibold text-attention lg:inline-block">
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </h2>
            <div role="group" aria-label="Show" className="flex gap-2 lg:col-span-2 lg:row-start-2 lg:w-fit lg:gap-1 lg:rounded-[10px] lg:bg-[#f2f5f1] lg:p-1">
              <button type="button" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')} className={`w-[76px] ${tabClass(filter === 'ALL')}`}>
                All
              </button>
              <button type="button" aria-pressed={filter === 'UNREAD'} onClick={() => setFilter('UNREAD')} className={`w-[122px] ${tabClass(filter === 'UNREAD')}`}>
                <span aria-hidden="true" className="lg:hidden">Unread · {unread}</span>
                <span aria-hidden="true" className="hidden lg:inline">Unread ({unread})</span>
                <span className="sr-only">Unread, {unread}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0 || markAll.isPending}
              className="inline-flex h-11 w-full items-center rounded-card border border-line bg-white px-4 text-xs font-semibold text-body hover:bg-surface disabled:cursor-not-allowed disabled:text-muted lg:col-start-2 lg:row-start-1 lg:h-10 lg:w-[116px] lg:justify-center lg:rounded-lg lg:border-0 lg:px-0 lg:text-label lg:font-medium lg:text-nav"
            >
              Mark all as read
            </button>
          </div>

          {query.isPending && (
            <PanelState
              role="status"
              title="Loading notifications"
              action={
                <>
                  <p className={stateText}>Getting the latest project updates.</p>
                  <span aria-hidden="true" className="h-[7px] w-[230px] rounded-full bg-line" />
                  <span aria-hidden="true" className="h-[7px] w-[190px] rounded-full bg-line" />
                  <span aria-hidden="true" className="h-[7px] w-[250px] rounded-full bg-line" />
                </>
              }
            />
          )}
          {query.isError && (
            <PanelState
              role="alert"
              title="Notifications could not be loaded"
              action={
                <>
                  <p className={stateText}>Check your connection and try again. Existing project data is unchanged.</p>
                  <button type="button" onClick={() => query.refetch()} className={`${stateButton} bg-action text-white hover:bg-heading`}>
                    Try again
                  </button>
                </>
              }
            />
          )}
          {query.isSuccess && items.length === 0 && (
            <PanelState title="You’re all caught up" action={<p className={stateText}>New project notifications will appear here.</p>}>
              <CaughtUpBadge />
            </PanelState>
          )}
          {query.isSuccess && items.length > 0 && shown.length === 0 && (
            <PanelState
              title="No unread notifications"
              action={
                <>
                  <p className={stateText}>Switch to All to review earlier notifications.</p>
                  <button type="button" onClick={() => setFilter('ALL')} className={`${stateButton} border border-line bg-[#e8eee5] text-body hover:bg-nav-active`}>
                    View all
                  </button>
                </>
              }
            >
              <CaughtUpBadge />
            </PanelState>
          )}
          {groupByDay(shown).map((group) => (
            <section key={group.label} aria-labelledby={`${titleId}-${group.key}`} className="flex flex-col gap-3 lg:gap-0">
              <h3
                id={`${titleId}-${group.key}`}
                className="text-xs leading-4 font-semibold text-muted lg:border-b lg:border-line lg:bg-surface lg:px-[15px] lg:py-2"
              >
                {group.label}
              </h3>
              <ul className="flex flex-col gap-3 lg:gap-0">
                {group.items.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} onOpenTask={openTask} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
