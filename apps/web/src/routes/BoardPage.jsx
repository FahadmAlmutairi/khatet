import { useParams } from 'react-router'

export default function BoardPage() {
  const { projectId } = useParams()

  return (
    <section>
      <h1 className="text-2xl font-bold text-heading">Board</h1>
      <p className="mt-2">
        The Kanban board for project <span className="font-mono">{projectId}</span> arrives with US-21.
      </p>
    </section>
  )
}
