import { useState } from 'react'
import { useNotifications } from '../../api/hooks.js'
import { BellIcon } from '../../components/icons.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'

// US-30: the bell shows how many notifications are unread.
export default function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const notifications = useNotifications()
  const unread = notifications.data?.unreadCount ?? 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative inline-flex size-11 items-center justify-center rounded-lg border border-line bg-white text-heading hover:bg-surface"
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-attention px-1 text-xs font-semibold text-white"
          >
            {unread}
          </span>
        )}
      </button>
      <NotificationsPanel open={open} onClose={() => setOpen(false)} query={notifications} />
    </>
  )
}
