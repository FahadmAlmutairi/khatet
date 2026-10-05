import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { fieldError, errorMessage } from '../../api/errors.js'
import { useMe, useRequestCode } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import { TextField } from '../../components/ui/Field.jsx'
import AuthLayout, { SampleSignInNote } from './AuthLayout.jsx'

// US-01 and US-02: one email form for new and returning users.
export default function SignInPage() {
  const navigate = useNavigate()
  const me = useMe()
  const requestCode = useRequestCode()
  const [email, setEmail] = useState('')

  if (me.data?.username) return <Navigate to="/projects" replace />

  function submit(event) {
    event.preventDefault()
    requestCode.mutate(email, {
      onSuccess: ({ email: sentTo }) => navigate('/sign-in/verify', { state: { email: sentTo } }),
    })
  }

  const emailError = fieldError(requestCode.error, 'email')

  return (
    <AuthLayout step="Step 1 of 3" title="Sign in or create an account">
      <p className="mt-2 text-base text-muted">Enter your email and we will send you a 6-digit code. No password needed.</p>
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
        />
        {requestCode.isError && !emailError && (
          <p role="alert" className="text-base text-blocked">
            {errorMessage(requestCode.error)}
          </p>
        )}
        <Button type="submit" loading={requestCode.isPending} className="justify-center">
          Send code
        </Button>
      </form>
      <SampleSignInNote />
    </AuthLayout>
  )
}
