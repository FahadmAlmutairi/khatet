import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '../../api/hooks.js'
import { ErrorState, LoadingState } from '../../components/ui/States.jsx'
import { WAKING_UP } from '../../components/ui/useTakingLong.js'

// Sends signed-out users to sign in and new users to choose a username first.
export default function RequireAuth() {
  const me = useMe()
  const location = useLocation()

  if (me.isPending) {
    return (
      <div className="px-6">
        <LoadingState label="Opening Khatet" slowMessage={WAKING_UP} />
      </div>
    )
  }
  // A failed load (server unreachable or erroring) is not the same as being signed out.
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
  if (!me.data) return <Navigate to="/sign-in" replace state={{ from: `${location.pathname}${location.search}` }} />
  if (!me.data.username) return <Navigate to="/sign-in/username" replace />
  return <Outlet />
}
