import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useInviteMember, useMembers, useUpdateMemberAccess } from '../../api/hooks.js'
import Avatar from '../../components/Avatar.jsx'
import Button from '../../components/ui/Button.jsx'
import Dialog from '../../components/ui/Dialog.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { formatTimestamp, roleLabel, TASK_ACCESS, taskAccessLabel } from '../../lib/domain.js'

// US-07: the owner invites a registered user by username.
function InviteDialog({ open, onClose, projectId }) {
  const invite = useInviteMember(projectId)
  const toast = useToast()
  const [username, setUsername] = useState('')

  function close() {
    setUsername('')
    invite.reset()
    onClose()
  }

  function submit(event) {
    event.preventDefault()
    invite.mutate(username, {
      onSuccess: (invitation) => {
        toast(`Invitation sent to @${invitation.username}.`)
        close()
      },
    })
  }

  const usernameError = fieldError(invite.error, 'username')

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Invite a member"
      description="They get a notification and can accept or decline. New members start with Edit assigned tasks access."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" loading={invite.isPending}>
            Send invitation
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} noValidate className="flex flex-col gap-3">
        <TextField
          label="Username"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="@username"
          autoComplete="off"
          error={usernameError}
          autoFocus
        />
        {invite.isError && !usernameError && (
          <p role="alert" className="text-base text-blocked">
            {errorMessage(invite.error)}
          </p>
        )}
      </form>
    </Dialog>
  )
}

// US-10: the owner changes a member's task access; the change applies at once.
function AccessSelect({ member, projectId }) {
  const update = useUpdateMemberAccess(projectId)
  const toast = useToast()
  return (
    <label className="flex flex-col gap-1 text-sm text-muted sm:items-end">
      <span className="sr-only">Task access for @{member.username}</span>
      <select
        value={member.taskAccess}
        disabled={update.isPending}
        onChange={(event) =>
          update.mutate(
            { userId: member.userId, taskAccess: event.target.value },
            {
              onSuccess: (updated) =>
                toast(`@${updated.username} now has ${taskAccessLabel(updated.taskAccess)} access.`),
              onError: (error) => toast(errorMessage(error), 'error'),
            },
          )
        }
        className="min-h-11 rounded-lg border border-line bg-white px-3 text-base text-body"
      >
        {TASK_ACCESS.map((access) => (
          <option key={access.value} value={access.value}>
            {access.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// US-09: everyone sees the owner and members; only the owner sees the controls.
export default function MembersPage() {
  const { project } = useOutletContext()
  const members = useMembers(project.id)
  const [inviting, setInviting] = useState(false)
  const isOwner = project.permissions.canManageMembers

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{project.name}</p>
          <h1 className="text-3xl font-semibold text-heading">Members</h1>
        </div>
        {isOwner && <Button onClick={() => setInviting(true)}>Invite member</Button>}
      </div>

      <details className="mt-4 max-w-2xl rounded-lg border border-line bg-white px-4 py-2 text-base">
        <summary className="min-h-11 cursor-pointer content-center font-medium text-heading">What each access level allows</summary>
        <ul className="mb-2 mt-1 flex list-disc flex-col gap-1 pl-5">
          {TASK_ACCESS.map((access) => (
            <li key={access.value}>
              <strong className="font-semibold">{access.label}:</strong> {access.help}
            </li>
          ))}
          <li>The project owner has full access.</li>
        </ul>
      </details>

      <div className="mt-6">
        {members.isPending && <LoadingState label="Loading members" />}
        {members.isError && (
          <ErrorState title="Members could not be loaded" message={errorMessage(members.error)} onRetry={() => members.refetch()} />
        )}
        {members.data && (
          <>
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {members.data.members.map((member) => (
                <li key={member.userId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-3">
                    <Avatar username={member.username} />
                    <div>
                      <p className="text-base font-semibold text-heading">@{member.username}</p>
                      <p className="text-sm text-muted">
                        {member.role === 'OWNER' ? 'Project owner · full access' : roleLabel(member.role)}
                      </p>
                    </div>
                  </div>
                  {member.role !== 'OWNER' &&
                    (isOwner ? (
                      <AccessSelect member={member} projectId={project.id} />
                    ) : (
                      <p className="text-base text-body">{taskAccessLabel(member.taskAccess)}</p>
                    ))}
                </li>
              ))}
            </ul>

            {isOwner && members.data.invitations.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-heading">Pending invitations</h2>
                <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
                  {members.data.invitations.map((invitation) => (
                    <li key={invitation.id} className="flex items-center gap-3 p-4">
                      <Avatar username={invitation.username} />
                      <div>
                        <p className="text-base font-semibold text-heading">@{invitation.username}</p>
                        <p className="text-sm text-muted">Invited {formatTimestamp(invitation.createdAt)} · Waiting for a reply</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {isOwner && <InviteDialog open={inviting} onClose={() => setInviting(false)} projectId={project.id} />}
    </section>
  )
}
