import { Link, Outlet, useParams } from 'react-router'
import { errorMessage } from '../../api/errors.js'
import { useProject } from '../../api/hooks.js'
import { PageSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState } from '../../components/ui/States.jsx'

// Loads the project once for its pages; a non-member gets a not-found message (NFR-11).
export default function ProjectLayout() {
  const { projectId } = useParams()
  const project = useProject(projectId)

  if (project.isPending) return <PageSkeleton label="Opening project" />
  if (project.isError) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState title="This project could not be opened" message={errorMessage(project.error)} />
        <Link to="/projects" className="mt-4 inline-flex min-h-11 items-center font-medium text-action underline">
          Go to your projects
        </Link>
      </div>
    )
  }
  return <Outlet context={{ project: project.data }} />
}
