import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../../api/hooks.js'
import { BellIcon } from '../../components/icons.jsx'
import { animate } from '../../lib/motion.js'
import NotificationsPanel from './NotificationsPanel.jsx'

// US-30: the bell shows how many notifications are unread.
export default function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const notifications = useNotifications()
  const unread = notifications.data?.unreadCount ?? 0
  const bellRef = useRef(null)
  const lastUnread = useRef(null)

  // The bell gives a small swing when a new notification arrives, not when the page loads.
  useEffect(() => {
    if (!notifications.data) return
    if (lastUnread.current !== null && unread > lastUnread.current) {
      animate(
        bellRef.current,
        [
          { transform: 'rotate(0)' },
          { transform: 'rotate(12deg)' },
          { transform: 'rotate(-9deg)' },
          { transform: 'rotate(5deg)' },
          { transform: 'rotate(0)' },
        ],
        { duration: 600, easing: 'ease-out' },
      )
    }
    lastUnread.current = unread
  }, [notifications.data, unread])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative inline-flex size-11 items-center lg:size-10 justify-center rounded-[10px] border border-line bg-white text-heading hover:bg-surface"
      >
        <span ref={bellRef} className="inline-flex origin-top">
          <BellIcon />
        </span>
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-2 top-1.5 size-1.5 rounded-full bg-[#e5484d] ring-2 ring-white" />
        )}
      </button>
      <NotificationsPanel open={open} onClose={() => setOpen(false)} query={notifications} />
    </>
  )
}
