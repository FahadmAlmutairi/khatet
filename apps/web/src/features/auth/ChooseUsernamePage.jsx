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
    <AuthLayout step="Step 3 of 3" title="Choose your username">
      <p className="text-sm leading-[21px] text-muted">Teammates use it to invite you.</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <TextField
          label="Unique username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. fahad"
          hint="3–20 characters: letters, numbers and underscores."
          error={usernameError}
        />
        {setUsername.isError && !usernameError && (
          <p role="alert" className="text-sm text-blocked">
            {errorMessage(setUsername.error)}
          </p>
        )}
        <Button type="submit" loading={setUsername.isPending} fullOnPhone className="w-full max-sm:h-12">
          Finish account
        </Button>
      </form>
    </AuthLayout>
  )
}
