function initialsFor(username) {
  return username.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()
}

export default function Avatar({ username, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'size-7 text-[11px]' : 'size-8 text-xs'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-action font-medium text-white ring-2 ring-white ${sizeClass}`}
      title={`@${username}`}
    >
      <span aria-hidden="true">{initialsFor(username)}</span>
    </span>
  )
}

// Shows up to `max` avatars, then a "+N" chip, with every username in the accessible name.
export function AvatarStack({ users, max = 3 }) {
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  const label = `Assigned to ${users.map((user) => `@${user.username}`).join(', ')}`

  return (
    <span role="img" aria-label={label} className="flex -space-x-1.5">
      {shown.map((user) => (
        <Avatar key={user.id} username={user.username} size="sm" />
      ))}
      {extra > 0 && (
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-full bg-surface-subtle text-[11px] font-medium text-heading ring-2 ring-white"
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
