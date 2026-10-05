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
        className="relative inline-flex size-11 items-center lg:size-10 justify-center rounded-[10px] border border-line bg-white text-heading hover:bg-surface"
      >
        <BellIcon />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-2 top-1.5 size-1.5 rounded-full bg-[#e5484d] ring-2 ring-white" />
        )}
      </button>
      <NotificationsPanel open={open} onClose={() => setOpen(false)} query={notifications} />
    </>
  )
}
