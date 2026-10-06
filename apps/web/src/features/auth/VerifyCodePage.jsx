import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useRequestCode, useVerifyCode } from '../../api/hooks.js'
import { Spinner } from '../../components/ui/Button.jsx'
import AuthLayout, { authButton, SampleSignInNote } from './AuthLayout.jsx'
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
    <AuthLayout step="Step 2 of 3" title="Check your email" after={<SampleSignInNote />}>
      <p className="text-sm leading-[21px] text-muted">
        We sent a six-digit code to {email}. The code expires in 10 minutes and works once.
      </p>
      <Link to="/sign-in" className="-my-3 inline-flex min-h-11 items-center self-start text-[13px] font-semibold text-action hover:underline">
        Wrong email? Change it
      </Link>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <CodeInput value={code} onChange={setCode} error={codeError} />
        {verify.isError && !codeError && (
          <p role="alert" className="text-sm text-blocked">
            {errorMessage(verify.error)}
          </p>
        )}
        <button type="submit" disabled={verify.isPending} aria-busy={verify.isPending || undefined} className={authButton}>
          {verify.isPending && <Spinner />}
          Verify code
        </button>
      </form>
      {/* Only the moment a new code can be requested is announced, not every second. */}
      <p className="sr-only" aria-live="polite">
        {secondsLeft > 0 ? '' : 'You can now request a new code.'}
      </p>
      <div className="-mt-1 flex justify-center text-[13px] leading-[18px] text-muted">
        {secondsLeft > 0 ? (
          <p>
            You can request a new code in {secondsLeft} seconds (00:{String(secondsLeft).padStart(2, '0')}).
          </p>
        ) : (
          <button
            type="button"
            onClick={sendAgain}
            disabled={resend.isPending}
            className="-my-3 inline-flex min-h-11 items-center gap-2 font-semibold text-action hover:underline"
          >
            {resend.isPending && <Spinner />}
            Send a new code
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
