import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { rememberReturnTo } from '../../api/returnTo.js'
import { fieldError, errorMessage } from '../../api/errors.js'
import { useMe, useRequestCode } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import { FieldError, TextField } from '../../components/ui/Field.jsx'
import { useFocusFirstInvalid } from '../../components/ui/useFocusFirstInvalid.js'
import AuthLayout, { SampleSignInNote } from './AuthLayout.jsx'

// US-01 and US-02: one email form for new and returning users.
export default function SignInPage() {
  const navigate = useNavigate()
  const from = useLocation().state?.from
  const me = useMe()
  const requestCode = useRequestCode()
  const formRef = useFocusFirstInvalid(requestCode.error)
  const [email, setEmail] = useState('')

  if (me.data?.username) return <Navigate to={from ?? '/projects'} replace />

  function submit(event) {
    event.preventDefault()
    rememberReturnTo(from)
    requestCode.mutate(email, {
      onSuccess: ({ email: sentTo }) => navigate('/sign-in/verify', { state: { email: sentTo } }),
    })
  }

  const emailError = fieldError(requestCode.error, 'email')

  return (
    <AuthLayout title="Sign in or create an account" after={<SampleSignInNote />}>
      <p className="text-sm leading-[21px] text-muted">We’ll email you a 6-digit code.</p>
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6">
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
          <FieldError role="alert">{errorMessage(requestCode.error)}</FieldError>
        )}
        <Button type="submit" loading={requestCode.isPending} fullOnPhone className="w-full max-sm:h-12">
          Continue with email
        </Button>
      </form>
    </AuthLayout>
  )
}
