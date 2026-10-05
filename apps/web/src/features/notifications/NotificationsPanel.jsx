import { useNavigate } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useMarkNotificationRead, useRespondToInvitation } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { formatTimestamp } from '../../lib/domain.js'

function InvitationActions({ notification }) {
  const respond = useRespondToInvitation()
  const toast = useToast()

  if (notification.invitationStatus !== 'PENDING') {
    return (
      <p className="mt-2 text-sm font-medium text-muted">
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
    <div className="mt-3 flex gap-2">
      <Button onClick={() => answer(true)} loading={busy && respond.variables?.accept}>
        Accept
      </Button>
      <Button variant="secondary" onClick={() => answer(false)} disabled={busy}>
        Decline
      </Button>
    </div>
  )
}

function NotificationItem({ notification, onOpenTask }) {
  const isInvitation = notification.type === 'INVITATION'
  const title = isInvitation ? 'Project invitation' : 'Task assigned'
  const body = isInvitation
    ? `@${notification.actorUsername} invited you to join “${notification.projectName}”.`
    : notification.taskTitle
      ? `@${notification.actorUsername} assigned you to “${notification.taskTitle}” in ${notification.projectName}.`
      : `A task in ${notification.projectName} was assigned to you and has since been deleted.`

  const content = (
    <>
      <span className="flex items-center gap-2">
        {!notification.read && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-attention" />}
        <span className={notification.read ? 'font-medium text-heading' : 'font-semibold text-heading'}>{title}</span>
        {!notification.read && <span className="sr-only">(unread)</span>}
      </span>
      <span className="mt-1 block text-base text-body">{body}</span>
      <span className="mt-1 block text-sm text-muted">
        {formatTimestamp(notification.createdAt)} · {notification.projectName}
      </span>
    </>
  )

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      {!isInvitation && notification.taskTitle ? (
        <button type="button" onClick={() => onOpenTask(notification)} className="block w-full text-left">
          {content}
        </button>
      ) : (
        <div>{content}</div>
      )}
      {isInvitation && <InvitationActions notification={notification} />}
    </li>
  )
}

export default function NotificationsPanel({ open, onClose, query }) {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()

  function openTask(notification) {
    if (!notification.read) markRead.mutate(notification.id)
    onClose()
    navigate(`/projects/${notification.projectId}/board?task=${notification.taskId}`)
  }

  const items = query.data?.items ?? []

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Notifications"
      description={query.data ? `${query.data.unreadCount} unread` : undefined}
    >
      {query.isPending && <LoadingState label="Loading notifications" />}
      {query.isError && <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />}
      {query.isSuccess && items.length === 0 && (
        <p className="py-8 text-center text-base text-muted">
          No notifications yet. Invitations and tasks assigned to you will appear here.
        </p>
      )}
      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onOpenTask={openTask} />
          ))}
        </ul>
      )}
    </Dialog>
  )
}
