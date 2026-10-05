import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

export default function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong while loading this page.'

  return (
    <main className="mx-auto max-w-xl px-4 py-12" role="alert">
      <h1 className="text-2xl font-bold text-heading">This page could not be shown</h1>
      <p className="mt-2">{message}</p>
      <Link to="/projects" className="mt-4 inline-flex min-h-11 items-center font-medium text-action underline">
        Go to my projects
      </Link>
    </main>
  )
}
