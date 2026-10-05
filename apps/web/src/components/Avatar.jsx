function initialsFor(username) {
  return username.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()
}

export default function Avatar({ username, size = 'md' }) {
  const sizeClass = { xs: 'size-6 text-xs', sm: 'size-7 text-xs', md: 'size-8 text-xs' }[size]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-action font-medium leading-4 text-white ${sizeClass}`}
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
    <span role="img" aria-label={label} className="flex -space-x-2">
      {shown.map((user) => (
        <Avatar key={user.id} username={user.username} />
      ))}
      {extra > 0 && (
        <span
          aria-hidden="true"
          className="inline-flex size-8 items-center justify-center rounded-full border-2 border-white bg-surface-subtle text-xs font-medium text-heading"
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
