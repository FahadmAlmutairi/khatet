import { useId, useState } from 'react'
import { useOutletContext } from 'react-router'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import { useInviteMember, useMe, useMembers, useUpdateMemberAccess } from '../../api/hooks.js'
import Avatar from '../../components/Avatar.jsx'
import { ChevronIcon } from '../../components/icons.jsx'
import Button from '../../components/ui/Button.jsx'
import Dialog, { MobileBackBar } from '../../components/ui/Dialog.jsx'
import { MemberRowsSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { taskAccessLabel } from '../../lib/domain.js'
import { FieldError } from '../../components/ui/Field.jsx'

// Figma: owner 211:198, member 216:199, access window 219:327, invite window 220:344;
// mobile list 737:2, manage access 900:691.

// Wording from the task access table in docs/project-overview.md, shown under each option.
const ACCESS_OPTIONS = [
  {
    value: 'VIEW_ONLY',
    label: 'View tasks only',
    help: 'View tasks. Cannot create, edit, or move tasks.',
  },
  {
    value: 'EDIT_ASSIGNED',
    label: 'Edit assigned tasks',
    tag: 'Default',
    help: 'Edit and move only the tasks assigned to them.',
  },
  {
    value: 'EDIT_ALL',
    label: 'Edit all tasks',
    help: 'Create, edit, move, and delete any task.',
  },
]

// US-07: the owner invites a registered user by username.
function InviteDialog({ open, onClose, projectId }) {
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
        toast(`Invitation sent to @${invitation.username}.`)
        close()
      },
    })
  }

  const usernameError = fieldError(invite.error, 'username')
  const otherError = invite.isError && !usernameError ? errorMessage(invite.error) : null

  return (
    <Dialog open={open} onClose={close} variant="page" width={560} labelledBy={`${id}-title`}>
      <MobileBackBar label="Members" onBack={close} />
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
            placeholder="@username"
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

// US-10: the owner picks one of three access levels; saving applies it at once.
function AccessDialog({ member, projectId, onClose }) {
  const update = useUpdateMemberAccess(projectId)
  const toast = useToast()
  const [picked, setPicked] = useState(null)
  const id = useId()
  const value = picked ?? member?.taskAccess

  function close() {
    setPicked(null)
    onClose()
  }

  function save(event) {
    event.preventDefault()
    const { userId, taskAccess: previous } = member
    update.mutate(
      { userId, taskAccess: value },
      {
        onSuccess: (updated) => {
          close()
          if (updated.taskAccess === previous) return
          toast(`@${updated.username} now has ${taskAccessLabel(updated.taskAccess)} access.`, 'info', {
            onUndo: () =>
              update.mutate({ userId, taskAccess: previous }, { onError: (error) => toast(errorMessage(error), 'error') }),
          })
        },
        onError: (error) => toast(errorMessage(error), 'error'),
      },
    )
  }

  return (
    <Dialog open={Boolean(member)} onClose={close} variant="page" width={500} labelledBy={`${id}-title`}>
      {member && (
        <>
          <MobileBackBar label="Members" onBack={close} />
          <form onSubmit={save} className="flex flex-col px-5 pt-3 pb-6 sm:px-6 sm:pt-6">
            <p className="hidden text-xs font-semibold text-muted uppercase sm:block">Task access</p>
            <h2 id={`${id}-title`} className="text-[26px] font-bold text-body sm:mt-2 sm:text-[22px] sm:font-semibold">
              <span className="sm:hidden">Manage access</span>
              <span className="sr-only sm:not-sr-only">
                <span className="sm:hidden"> for </span>@{member.username}
              </span>
            </h2>
            <p className="mt-3 text-[15px] font-semibold text-body sm:hidden">@{member.username} · Team Member</p>
            <fieldset className="mt-4 flex flex-col gap-3 sm:mt-6">
              <legend className="sr-only">Task access for @{member.username}</legend>
              {ACCESS_OPTIONS.map((option) => {
                const checked = value === option.value
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-[10px] border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                      checked ? 'border-[#668a66] bg-nav-active' : 'border-line bg-white hover:bg-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${id}-access`}
                      value={option.value}
                      checked={checked}
                      onChange={() => setPicked(option.value)}
                      aria-describedby={`${id}-${option.value}-help`}
                      className="mt-px size-[18px] shrink-0 accent-action"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] leading-[19px] font-semibold text-body">
                        {option.label}
                        {option.tag && ` · ${option.tag}`}
                      </span>
                      <span id={`${id}-${option.value}-help`} className="text-label leading-4 text-muted">
                        {option.help}
                      </span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={close} className="max-sm:hidden">
                Cancel
              </Button>
              <Button type="submit" loading={update.isPending} fullOnPhone>
                Save access
              </Button>
            </div>
          </form>
        </>
      )}
    </Dialog>
  )
}

const columns = 'lg:grid lg:grid-cols-[minmax(0,400fr)_170px_minmax(0,370fr)_164px] lg:items-center'

function MemberRow({ member, isOwner, isYou, onManage }) {
  const owner = member.role === 'OWNER'
  const access = owner ? 'Full access' : taskAccessLabel(member.taskAccess)
  return (
    <li
      className={`flex min-h-16 items-center gap-3 rounded-card border border-line bg-white px-[14px] py-3 lg:h-[78px] lg:gap-0 lg:rounded-none lg:border-0 lg:border-b lg:px-5 lg:py-0 ${columns}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar username={member.username} size="lg" />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] leading-5 font-semibold text-body lg:text-sm">@{member.username}</span>
            {isYou && <span className="shrink-0 rounded-full bg-[#f1f3f0] px-2 py-0.5 text-xs font-medium text-body">You</span>}
          </p>
          <p className="text-xs text-muted lg:hidden">{owner ? 'Project Owner · Full access' : `Team Member · ${access}`}</p>
        </div>
      </div>
      <div className="hidden lg:block">
        <span
          className={`inline-flex rounded-full px-2.5 text-xs leading-4 font-medium text-body ${
            owner ? 'bg-[#e8f0e5] py-2' : 'border border-line py-[7px]'
          }`}
        >
          {owner ? 'Project Owner' : 'Team Member'}
        </span>
      </div>
      <p className="hidden text-sm text-muted lg:block">{access}</p>
      <div className="flex justify-end">
        {isOwner && !owner && (
          <button
            type="button"
            onClick={() => onManage(member)}
            aria-label={`Manage access for @${member.username}`}
            className="inline-flex size-11 items-center justify-center rounded-full text-body hover:bg-surface lg:h-10 lg:w-auto lg:border lg:border-line lg:px-2.5 lg:text-xs lg:font-medium"
          >
            <span className="lg:hidden">
              <ChevronIcon />
            </span>
            <span aria-hidden="true" className="hidden lg:inline">
              Manage access
            </span>
          </button>
        )}
      </div>
    </li>
  )
}

// US-09: everyone sees the owner and members; only the owner sees the controls.
export default function MembersPage() {
  const { project } = useOutletContext()
  const members = useMembers(project.id)
  const [inviting, setInviting] = useState(false)
  const [managing, setManaging] = useState(null)
  const isOwner = project.permissions.canManageMembers
  const me = useMe()
  const list = members.data?.members ?? []
  const crumbs = useBreadcrumb()
  useDocumentTitle('Members', project.name)

  return (
    <section>
      <Breadcrumb items={crumbs} className="lg:hidden" />
      {/* The main action sits beside the page title, as on Home and the board. */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4 lg:mt-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-bold text-body">Members</h1>
          {members.data && (
            <p className={`text-sm text-muted ${isOwner ? '' : 'lg:hidden'}`}>
              {list.length} project {list.length === 1 ? 'member' : 'members'}
            </p>
          )}
        </div>
        {members.data && isOwner && (
          <Button onClick={() => setInviting(true)} fullOnPhone>
            Invite member
          </Button>
        )}
      </div>

      {/* A Team Member sees why the page has no Invite or Manage access buttons (Figma: Members, Team Member). */}
      {members.data && !isOwner && (
        <div className="mt-4 hidden flex-col gap-1 lg:flex">
          <p className="text-base font-semibold text-body">
            {list.length} project {list.length === 1 ? 'member' : 'members'}
          </p>
          <p className="text-sm text-muted">Only the project owner can invite people or change access.</p>
        </div>
      )}
      {members.isPending && <MemberRowsSkeleton />}
      {members.isError && (
        <div className="mt-6">
          <ErrorState title="Members could not be loaded" message={errorMessage(members.error)} onRetry={() => members.refetch()} />
        </div>
      )}
      {members.data && (
        <>
          <div className="mt-6 lg:overflow-hidden lg:rounded-card lg:border lg:border-line lg:bg-white">
            <div
              aria-hidden="true"
              className={`hidden h-12 border-b border-line bg-[#f6f8f6] px-5 text-xs leading-4 font-semibold text-muted ${columns}`}
            >
              <span>Member</span>
              <span>Role</span>
              <span>Access</span>
              <span />
            </div>
            <ul aria-label="Project members" className="flex flex-col gap-2.5 lg:gap-0">
              {list.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  isOwner={isOwner}
                  isYou={!isOwner && member.userId === me.data?.id}
                  onManage={setManaging}
                />
              ))}
            </ul>
          </div>
        </>
      )}

      {isOwner && <InviteDialog open={inviting} onClose={() => setInviting(false)} projectId={project.id} />}
      {isOwner && <AccessDialog member={managing} projectId={project.id} onClose={() => setManaging(null)} />}
    </section>
  )
}
