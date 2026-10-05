import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useRequestCode, useVerifyCode } from '../../api/hooks.js'
import Button from '../../components/ui/Button.jsx'
import AuthLayout, { SampleSignInNote } from './AuthLayout.jsx'
import CodeInput from './CodeInput.jsx'

const RESEND_SECONDS = 30

export default function VerifyCodePage() {
  const navigate = useNavigate()
  const email = useLocation().state?.email
  const verify = useVerifyCode()
  const resend = useRequestCode()
  const [code, setCode] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  if (!email) return <Navigate to="/sign-in" replace />

  function submit(event) {
    event.preventDefault()
    verify.mutate(code, {
      onSuccess: (user) => navigate(user.username ? '/projects' : '/sign-in/username', { replace: true }),
    })
  }

  function sendAgain() {
    resend.mutate(email, {
      onSuccess: () => {
        setSecondsLeft(RESEND_SECONDS)
        setCode('')
        verify.reset()
      },
    })
  }

  const codeError = fieldError(verify.error, 'code')

  return (
    <AuthLayout step="Step 2 of 3" title="Check your email">
      <p className="mt-2 text-base text-muted">
        We sent a 6-digit code to <strong className="font-semibold text-heading">{email}</strong>. The code expires in 10
        minutes and works once.
      </p>
      <Link to="/sign-in" className="mt-2 inline-flex min-h-11 items-center text-base font-medium text-action underline">
        Wrong email? Change it
      </Link>
      <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4">
        <CodeInput value={code} onChange={setCode} error={codeError} />
        {verify.isError && !codeError && (
          <p role="alert" className="text-base text-blocked">
            {errorMessage(verify.error)}
          </p>
        )}
        <Button type="submit" loading={verify.isPending} className="justify-center">
          Verify code
        </Button>
      </form>
      <div className="mt-4 text-center text-base text-muted" aria-live="polite">
        {secondsLeft > 0 ? (
          <p>You can request a new code in {secondsLeft} seconds.</p>
        ) : (
          <Button variant="ghost" onClick={sendAgain} loading={resend.isPending} className="mx-auto">
            Send a new code
          </Button>
        )}
      </div>
      <SampleSignInNote />
    </AuthLayout>
  )
}
