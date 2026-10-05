import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useProjects } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { roleLabel } from '../../lib/domain.js'
import CreateProjectDialog from './CreateProjectDialog.jsx'

function RolePill({ role }) {
  const owner = role === 'OWNER'
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${
        owner ? 'bg-action text-white' : 'bg-surface-subtle text-heading'
      }`}
    >
      <span className="sr-only">Your role: </span>
      {roleLabel(role)}
    </span>
  )
}

// US-04 lists the user's projects with their role; US-06 opens one.
export default function ProjectsPage() {
  const projects = useProjects()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const creating = searchParams.get('new') === 'project'

  function setCreating(value) {
    setSearchParams(value ? { new: 'project' } : {}, { replace: true })
  }

  const createButton = <Button onClick={() => setCreating(true)}>Create project</Button>

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-heading">Your projects</h1>
          <p className="mt-1 text-base text-muted">Projects you own or were invited to. Open one to see its board.</p>
        </div>
        {projects.data?.length > 0 && createButton}
      </div>

      <div className="mt-6">
        {projects.isPending && <LoadingState label="Loading your projects" />}
        {projects.isError && (
          <ErrorState title="Your projects could not be loaded" message={errorMessage(projects.error)} onRetry={() => projects.refetch()} />
        )}
        {projects.data?.length === 0 && (
          <EmptyState title="No projects yet" action={createButton}>
            <p>Create a project to start planning, or wait for a teammate to invite you.</p>
            <p>Invitations appear in Notifications, where you can accept or decline them.</p>
          </EmptyState>
        )}
        {projects.data?.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.data.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}/board`}
                  className="flex h-full flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-card hover:border-surface-supporting"
                >
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-supporting font-semibold text-heading"
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold text-heading">{project.name}</span>
                      {project.description && <span className="block text-base text-muted">{project.description}</span>}
                    </span>
                    <RolePill role={project.role} />
                  </span>
                  <span className="mt-auto text-sm font-medium text-action">
                    Open board <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateProjectDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(project) => toast(`${project.name} was created. You are its owner.`)}
      />
    </section>
  )
}
