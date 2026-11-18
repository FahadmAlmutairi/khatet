import { Suspense, useCallback, useEffect, useRef } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '../../api/errors.js'
import { useProject } from '../../api/hooks.js'
import { PageSkeleton } from '../../components/ui/Skeleton.jsx'
import { ErrorState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'

// Loads the project once for its pages; a non-member gets a not-found message (NFR-11).
export default function ProjectLayout() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const handledDeletion = useRef(false)

  const handleDeleted = useCallback(() => {
    if (handledDeletion.current) return
    handledDeletion.current = true
    toast('This project was deleted')
    navigate('/projects', { replace: true })
  }, [navigate, toast])

  useEffect(() => {
    handledDeletion.current = false
  }, [projectId])

  useEffect(() => {
    const belongsToProject = (queryKey) =>
      queryKey.some((part) => part === projectId || (part && typeof part === 'object' && part.projectId === projectId))
    const stopQueries = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.action.type === 'error' &&
        belongsToProject(event.query.queryKey) &&
        event.query.state.error?.code === 'PROJECT_DELETED'
      ) {
        handleDeleted()
      }
    })
    const stopMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error' && event.mutation.state.error?.code === 'PROJECT_DELETED') {
        handleDeleted()
      }
    })
    return () => {
      stopQueries()
      stopMutations()
    }
  }, [handleDeleted, projectId, queryClient])

  useEffect(() => {
    if (project.error?.code === 'PROJECT_DELETED') handleDeleted()
  }, [handleDeleted, project.error])

  if (project.isPending) return <PageSkeleton label="Opening project" />
  if (project.error?.code === 'PROJECT_DELETED') return null
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
  return (
    <Suspense fallback={<PageSkeleton label="Opening project" />}>
      <Outlet context={{ project: project.data }} />
    </Suspense>
  )
}
