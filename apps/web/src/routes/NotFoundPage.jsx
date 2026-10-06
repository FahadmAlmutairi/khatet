import { Link } from 'react-router'
import { useDocumentTitle } from '../app/pageMeta.js'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <section>
      <h1 className="text-2xl font-bold text-heading">Page not found</h1>
      <p className="mt-2">This address does not match a page in Khatet.</p>
      <Link to="/projects" className="mt-4 inline-flex min-h-11 items-center font-medium text-action underline">
        Go to my projects
      </Link>
    </section>
  )
}
