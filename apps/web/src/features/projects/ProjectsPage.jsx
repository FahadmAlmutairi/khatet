import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import { useProjects } from '../../api/hooks.js'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'
import { roleLabel } from '../../lib/domain.js'
import CreateProjectDialog from './CreateProjectDialog.jsx'

// Figma: Home 1069:2138 (projects) and 1070:2185 (no projects).
const createButtonClass =
  'inline-flex h-11 shrink-0 items-center justify-center rounded-[9px] bg-action px-[18px] text-[13px] leading-[18px] font-medium text-white hover:bg-heading'

function RolePill({ role }) {
  const owner = role === 'OWNER'
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${owner ? 'bg-[#3b5442] text-white' : 'bg-[#e8ede5] text-[#212b24]'}`}>
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
  const empty = projects.data?.length === 0
  useDocumentTitle('Your projects')

  function setCreating(value) {
    setSearchParams(value ? { new: 'project' } : {}, { replace: true })
  }

  const createButton = (
    <button type="button" onClick={() => setCreating(true)} className={createButtonClass}>
      Create project
    </button>
  )

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-[34px] font-bold text-body">Your projects</h1>
          <p className="text-sm leading-[21px] text-muted">
            {empty ? 'Projects you own or were invited to.' : 'Projects you own or were invited to. Open one to see its board.'}
          </p>
        </div>
        {projects.data && createButton}
      </div>

      {projects.isPending && <LoadingState label="Loading your projects" />}
      {projects.isError && (
        <ErrorState title="Your projects could not be loaded" message={errorMessage(projects.error)} onRetry={() => projects.refetch()} />
      )}
      {empty && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-8 py-12 text-center">
          <h2 className="text-xl font-bold text-body">No projects yet</h2>
          <div className="text-base text-muted">
            <p>Create a project to start planning, or wait for a teammate to invite you.</p>
            <p>Invitations appear in Notifications, where you can accept or decline them.</p>
          </div>
          {createButton}
        </div>
      )}
      {projects.data?.length > 0 && (
        <ul className="flex flex-wrap gap-4">
          {projects.data.map((project) => (
            <li key={project.id} className="w-full sm:w-[360px]">
              <Link
                to={`/projects/${project.id}/board`}
                className="flex h-full flex-col gap-2.5 rounded-xl border border-line bg-surface p-4 hover:border-surface-supporting hover:bg-white"
              >
                <span className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-supporting text-xs leading-4 font-medium text-heading"
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base leading-[21px] text-body">{project.name}</span>
                    {project.description && <span className="text-sm leading-[18px] text-muted">{project.description}</span>}
                  </span>
                  <RolePill role={project.role} />
                </span>
                <span className="text-xs leading-[18px] whitespace-pre text-heading">
                  {'Open board  '}
                  <span aria-hidden="true">→</span>
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
