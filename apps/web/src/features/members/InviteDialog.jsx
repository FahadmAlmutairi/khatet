import { useId, useState } from 'react'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useInviteMember } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import Dialog, { MobileBackBar } from '../../components/ui/Dialog.jsx'
import { FieldError } from '../../components/ui/Field.jsx'
import { useToast } from '../../components/ui/toastContext.js'

// Figma: invite window 220:344. Opened from the Members page and from the board header,
// so inviting takes 3 taps or fewer from the board on any screen (NFR-01).
// US-07: the owner invites a registered user by username.
export default function InviteDialog({ open, onClose, projectId, backLabel = 'Members' }) {
  const invite = useInviteMember(projectId)
  const toast = useToast()
  const [username, setUsername] = useState('')
  const id = useId()

  function close() {
    setUsername('')
    invite.reset()
    onClose()
  }

  function submit(event) {
    event.preventDefault()
    invite.mutate(username, {
      onSuccess: (invitation) => {
        toast(`Invitation sent to ${invitation.username}.`)
        close()
      },
    })
  }

  const usernameError = fieldError(invite.error, 'username')
  const otherError = invite.isError && !usernameError ? errorMessage(invite.error) : null

  return (
    <Dialog open={open} onClose={close} variant="page" width={560} labelledBy={`${id}-title`}>
      <MobileBackBar label={backLabel} onBack={close} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-[18px] px-5 pt-3 pb-6 sm:px-7 sm:pt-7 sm:pb-6">
        <div className="flex flex-col gap-1.5">
          <h2 id={`${id}-title`} className="text-[26px] leading-8 font-bold text-body">
            Invite a team member
          </h2>
          <p className="text-sm leading-5 text-muted">They join with Edit assigned tasks access.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-username`} className="text-xs leading-4 font-semibold text-body">
            Username
            <span aria-hidden="true" className="text-blocked">
              {' '}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={`${id}-username`}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="username"
            autoComplete="off"
            autoFocus
            aria-required="true"
            aria-invalid={Boolean(usernameError)}
            aria-describedby={usernameError ? `${id}-error` : `${id}-hint`}
            className="h-11 w-full rounded-[10px] border border-input bg-white px-[14px] text-sm text-body placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked"
          />
          {usernameError ? (
            <FieldError id={`${id}-error`}>{usernameError}</FieldError>
          ) : (
            <p id={`${id}-hint`} className="text-sm text-muted">
              They will see the invitation on Home and in Notifications.
            </p>
          )}
        </div>
        {otherError && (
          <FieldError role="alert">{otherError}</FieldError>
        )}
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={close} className="max-sm:hidden">
            Cancel
          </Button>
          <Button type="submit" loading={invite.isPending} fullOnPhone>
            Send invitation
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
