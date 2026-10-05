import { Navigate, Outlet, useLocation } from 'react-router'
import { useMe } from '../../api/hooks.js'
import { LoadingState } from '../../components/ui/States.jsx'

// Sends signed-out users to sign in and new users to choose a username first.
export default function RequireAuth() {
  const me = useMe()
  const location = useLocation()

  if (me.isPending) {
    return (
      <div className="px-6">
        <LoadingState label="Opening Khatet" />
      </div>
    )
  }
  if (!me.data) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  if (!me.data.username) return <Navigate to="/sign-in/username" replace />
  return <Outlet />
}
