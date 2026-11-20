import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useArchivedProject } from '../../api/hooks.js'
import { useDocumentTitle } from '../../app/pageMeta.js'
import Button from '../../components/ui/Button.jsx'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { formatShortDate, statusLabel } from '../../lib/domain.js'
import { ProjectLog } from '../activity/ActivityPage.jsx'
import DeleteArchivedDialog from './DeleteArchivedDialog.jsx'

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'DONE']

// An archived project: the summary copied when it was archived, and its full project log.
export default function ArchivedProjectPage() {
  const { archivedId } = useParams()
  const archived = useArchivedProject(archivedId)
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  useDocumentTitle('Archived project', archived.data?.name)

  if (archived.isPending) return <LoadingState label="Opening the archived project" />
  if (archived.isError) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState title="This archived project could not be opened" message={errorMessage(archived.error)} />
        <Link to="/account" className="mt-4 inline-flex min-h-11 items-center font-medium text-action underline">
          Go to Settings
        </Link>
      </div>
    )
  }

  const project = archived.data
  const summary = project.summary ?? {}
  const tasks = summary.tasks

  return (
    <section className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold text-body">{project.name}</h1>
        <p className="text-sm text-muted">
          Archived by {project.archivedByUsername} on {formatShortDate(project.archivedAt)}. The board and chat are
          closed; the project log below is kept.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-body">Summary when archived</h2>
        {summary.description && <p className="text-sm text-body">{summary.description}</p>}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {summary.members && (
            <div>
              <dt className="font-medium text-heading">Members</dt>
              <dd className="mt-1 text-body">
                {summary.members
                  .map((member) => (member.role === 'OWNER' ? `${member.username} (owner)` : member.username))
                  .join(', ')}
              </dd>
            </div>
          )}
          {tasks && (
            <div>
              <dt className="font-medium text-heading">Tasks</dt>
              <dd className="mt-1 text-body">
                {tasks.total} in total
                {tasks.total > 0 &&
                  `: ${STATUSES.filter((status) => tasks.byStatus?.[status])
                    .map((status) => `${tasks.byStatus[status]} ${statusLabel(status)}`)
                    .join(', ')}`}
              </dd>
            </div>
          )}
        </dl>
        <div>
          <Button variant="danger" onClick={() => setDeleting(true)} fullOnPhone>
            Delete permanently
          </Button>
        </div>
      </div>

      <ProjectLog projectId={project.id} heading={<h2 className="text-lg font-semibold text-body">Project log</h2>} />

      <DeleteArchivedDialog
        project={deleting ? project : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/account')}
      />
    </section>
  )
}
