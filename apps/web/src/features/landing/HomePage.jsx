import { Suspense } from 'react'
import { Navigate } from 'react-router'
import { useMe } from '../../api/hooks.js'
import { LandingPage } from '../../app/lazyPages.js'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { useTakingLong, WAKING_UP } from '../../components/ui/useTakingLong.js'

// The address everyone starts at. Signed-in people go to their projects (and new accounts to
// choose a username); everyone else sees the public landing page.
export default function HomePage() {
  const me = useMe()
  // Checking a visitor with no saved session takes a moment, so the spinner waits before it shows.
  const showSpinner = useTakingLong(me.isPending, 400)

  if (me.data?.username) return <Navigate to="/projects" replace />
  if (me.data) return <Navigate to="/sign-in/username" replace />
  if (me.isPending) {
    return <div className="min-h-dvh bg-surface px-6">{showSpinner && <LoadingState label="Opening Khatet" slowMessage={WAKING_UP} />}</div>
  }
  // A failed load only happens with a saved session whose account could not be loaded.
  if (me.isError) {
    return (
      <div className="px-6 py-12">
        <ErrorState
          title="Khatet could not be opened"
          message="The server did not answer. It may still be starting up. Try again in a moment."
          onRetry={() => me.refetch()}
        />
      </div>
    )
  }
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <LandingPage />
    </Suspense>
  )
}
