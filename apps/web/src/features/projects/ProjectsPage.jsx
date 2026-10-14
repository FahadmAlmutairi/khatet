import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import { useNotifications, useProjects } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import { ProjectCardsSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { formatShortDate, roleLabel } from '../../lib/domain.js'
import { InvitationActions } from '../notifications/NotificationsPanel.jsx'
import CreateProjectDialog from './CreateProjectDialog.jsx'

// Figma: Home 1069:2138 (projects) and 1070:2185 (no projects).
// Both roles use one quiet grey pill, so the project name stays the first thing read.
function RolePill({ role }) {
  return (
    <span className="shrink-0 rounded-full bg-[#f1f3f0] px-2.5 py-1 text-xs font-medium text-muted">
      <span className="sr-only">Your role: </span>
      {roleLabel(role)}
    </span>
  )
}

// Invitations still waiting for an answer also show on Home, with the same Decline and Accept
// as in Notifications (US-08), so a new member does not have to find them in the bell.
// Figma: Home, pending invitation banner (desktop and mobile).
function PendingInvitations() {
  const notifications = useNotifications()
  const pending = (notifications.data?.items ?? []).filter(
    (item) => item.type === 'INVITATION' && item.invitationStatus === 'PENDING',
  )
  if (pending.length === 0) return null
  return (
    <section aria-label="Invitations">
      <ul className="flex flex-col gap-3">
        {pending.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-action bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:pl-5"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <p className="font-semibold text-body">
                @{item.actorUsername} invited you to {item.projectName}
              </p>
              <p className="text-muted">You will join as a team member. Invited {formatShortDate(item.createdAt)}.</p>
            </div>
            <InvitationActions
              notification={item}
              size="large"
              className="grid grid-cols-2 gap-2 sm:flex sm:gap-4"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

// US-04 lists the user's projects with their role; US-06 opens one.
export default function ProjectsPage() {
  const projects = useProjects()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const creating = searchParams.get('new') === 'project'
  const empty = projects.data?.length === 0
  useDocumentTitle('Your projects')

  function setCreating(value) {
    setSearchParams(value ? { new: 'project' } : {}, { replace: true })
  }

  const createButton = <Button onClick={() => setCreating(true)}>Create project</Button>

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-title font-bold text-body">Your projects</h1>
        </div>
        {/* While there are no projects, the empty state holds the only Create project button. */}
        {projects.data?.length > 0 && createButton}
      </div>

      <PendingInvitations />

      {projects.isPending && <ProjectCardsSkeleton />}
      {projects.isError && (
        <ErrorState title="Your projects could not be loaded" message={errorMessage(projects.error)} onRetry={() => projects.refetch()} />
      )}
      {empty && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white px-8 py-12 text-center">
          <h2 className="text-xl font-bold text-body">No projects yet</h2>
          <p className="max-w-[420px] text-base text-muted">
            Create a project to get a board for your team. When someone invites you, the invitation shows here too.
          </p>
          {createButton}
        </div>
      )}
      {projects.data?.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {projects.data.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}/board`}
                className="card-lift flex h-full flex-col gap-2.5 rounded-card border border-line bg-white p-4 shadow-card hover:border-surface-supporting"
              >
                <span className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-supporting text-xs leading-4 font-medium text-heading"
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base leading-[21px] font-semibold text-body">{project.name}</span>
                    {project.description && <span className="text-sm leading-[18px] text-muted">{project.description}</span>}
                  </span>
                  <RolePill role={project.role} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateProjectDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(project) => toast(`${project.name} was created. You are its owner.`)}
      />
    </section>
  )
}
