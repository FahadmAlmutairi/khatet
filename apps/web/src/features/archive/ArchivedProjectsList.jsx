import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useArchivedProjects } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { formatShortDate } from '../../lib/domain.js'
import DeleteArchivedDialog from './DeleteArchivedDialog.jsx'
import RestoreProjectDialog from './RestoreProjectDialog.jsx'

// Settings > Archived projects: each archived project the user was in, with its log.
export default function ArchivedProjectsList() {
  const archived = useArchivedProjects()
  const [deleting, setDeleting] = useState(null)
  const [restoring, setRestoring] = useState(null)

  return (
    <div className="mt-6 rounded-card border border-line bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-body">Archived projects</h2>
      <p className="mt-1 text-sm text-muted">
        The project log of each archived project you were in, so you can still see who did what.
      </p>
      {archived.isPending && <LoadingState label="Loading archived projects" />}
      {archived.isError && (
        <div className="mt-4">
          <ErrorState
            title="Archived projects could not be loaded"
            message={errorMessage(archived.error)}
            onRetry={() => archived.refetch()}
          />
        </div>
      )}
      {archived.isSuccess && archived.data.length === 0 && (
        <p className="mt-4 text-sm text-muted">You have no archived projects.</p>
      )}
      {archived.isSuccess && archived.data.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-line rounded-xl border border-line">
          {archived.data.map((project) => (
            <li key={project.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/account/archived/${project.id}`} className="truncate font-medium text-heading underline">
                  {project.name}
                </Link>
                <span className="text-sm text-muted">
                  Archived by {project.archivedByUsername} on {formatShortDate(project.archivedAt)}
                </span>
              </div>
              <div className="flex gap-2">
                {project.role === 'OWNER' && (
                  <Button variant="secondary" onClick={() => setRestoring(project)}>
                    Restore
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setDeleting(project)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <DeleteArchivedDialog project={deleting} onClose={() => setDeleting(null)} />
      <RestoreProjectDialog project={restoring} onClose={() => setRestoring(null)} />
    </div>
  )
}
