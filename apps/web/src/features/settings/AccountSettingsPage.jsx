import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { useDocumentTitle } from '../../app/pageMeta.js'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useMe, useSetUsername } from '../../api/hooks.js'
import { TextField } from '../../components/ui/Field.jsx'
import Button from '../../components/ui/Button.jsx'

export default function AccountSettingsPage() {
  useDocumentTitle('Account settings')

  const me = useMe()
  const setUsername = useSetUsername()
  const [username, setValue] = useState(me.data?.username ?? '')
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (me.data?.username) setValue(me.data.username)
  }, [me.data?.username])

  if (me.isPending) return <p className="p-6 text-sm text-muted">Loading your account…</p>
  if (!me.data) return <Navigate to="/sign-in" replace />

  function handleChange(event) {
    setValue(event.target.value)
    setSavedMessage('')
    if (setUsername.isError) setUsername.reset()
  }

  function submit(event) {
    event.preventDefault()
    setSavedMessage('')
    setUsername.reset()
    setUsername.mutate(username, { onSuccess: () => setSavedMessage('Username saved.') })
  }

  const usernameError = fieldError(setUsername.error, 'username')

  return (
    <main id="main" className="flex min-h-[calc(100vh-5rem)] flex-1 items-start justify-center bg-surface px-4 py-10 sm:px-6 lg:pt-12">
      <section className="w-full max-w-[480px] rounded-[20px] border border-line bg-white p-6 shadow-[0_2px_8px_rgba(48,64,54,0.05)] sm:p-8">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.66px] text-muted uppercase">Account</p>
          <h1 className="text-[26px] font-bold text-body">Account settings</h1>
          <p className="text-sm text-muted">Change your user name.</p>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={handleChange}
            placeholder="e.g. fahad"
            hint="3–20 characters: letters, numbers and underscores."
            error={usernameError}
          />

          {setUsername.isError && !usernameError && (
            <p role="alert" className="text-sm text-blocked">
              {errorMessage(setUsername.error)}
            </p>
          )}

          {savedMessage && (
            <p role="status" className="text-sm font-medium text-heading">
              {savedMessage}
            </p>
          )}

          <Button type="submit" loading={setUsername.isPending} className="w-full justify-center" disabled={!username.trim()}>
            Save username
          </Button>
        </form>
      </section>
    </main>
  )
}
