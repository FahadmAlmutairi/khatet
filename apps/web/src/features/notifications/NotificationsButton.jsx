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
        {/* NOT-01: the badge shows the number itself, not only a dot. Above 9 it reads "9+". */}
        {unread > 0 && (
          <span
            aria-hidden="true"
            data-testid="unread-badge"
            className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e5484d] px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <NotificationsPanel open={open} onClose={() => setOpen(false)} query={notifications} />
    </>
  )
}
