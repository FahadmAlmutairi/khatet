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
    <AuthLayout step="Step 1 of 3" title="Sign in or create an account" after={<SampleSignInNote />}>
      <p className="text-sm leading-[21px] text-muted">We’ll email you a 6-digit code.</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          error={emailError}
        />
        {requestCode.isError && !emailError && (
          <p role="alert" className="text-sm text-blocked">
            {errorMessage(requestCode.error)}
          </p>
        )}
        <Button type="submit" loading={requestCode.isPending} fullOnPhone className="w-full max-sm:h-12">
          Continue with email
        </Button>
      </form>
    </AuthLayout>
  )
}
