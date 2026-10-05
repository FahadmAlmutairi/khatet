import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useMe, useSetUsername } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import { LoadingState } from '../../components/ui/States.jsx'
import AuthLayout from './AuthLayout.jsx'

// US-01: a new user picks a unique username before using projects.
export default function ChooseUsernamePage() {
  const navigate = useNavigate()
  const me = useMe()
  const setUsername = useSetUsername()
  const [username, setValue] = useState('')

  if (me.isPending) return <LoadingState />
  if (!me.data) return <Navigate to="/sign-in" replace />
  if (me.data.username) return <Navigate to="/projects" replace />

  function submit(event) {
    event.preventDefault()
    setUsername.mutate(username, { onSuccess: () => navigate('/projects', { replace: true }) })
  }

  const usernameError = fieldError(setUsername.error, 'username')

  return (
    <AuthLayout step="Step 3 of 3" title="Choose a username">
      <p className="mt-2 text-base text-muted">
        Teammates invite you and assign you tasks by your username. Nobody else can have the same one.
      </p>
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setValue(event.target.value)}
          hint="Letters, numbers and underscores, 3 to 20 characters."
          error={usernameError}
        />
        {setUsername.isError && !usernameError && (
          <p role="alert" className="text-base text-blocked">
            {errorMessage(setUsername.error)}
          </p>
        )}
        <Button type="submit" loading={setUsername.isPending} className="justify-center">
          Continue
        </Button>
      </form>
    </AuthLayout>
  )
}
