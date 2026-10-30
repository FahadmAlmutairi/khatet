import { useState } from 'react'
import { errorMessage, fieldError } from '../../api/errors.js'
import { useMe, useSetUsername } from '../../api/hooks.js'
import { useBreadcrumb, useDocumentTitle } from '../../app/pageMeta.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Button from '../../components/ui/Button.jsx'
import { FieldError, TextField } from '../../components/ui/Field.jsx'
import { LoadingState } from '../../components/ui/States.jsx'
import { useToast } from '../../components/ui/toastContext.js'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

// When the API says the next change is allowed (usernameChangeableAt), the hint names the day;
// until then it states the rule, and the API's own message explains a refused change.
function changeHint(me, now = new Date()) {
  const next = me.usernameChangeableAt && new Date(me.usernameChangeableAt)
  if (next && next > now) return `You can change your username again on ${dateFormat.format(next)}.`
  return 'You can change your username once every 30 days.'
}

function ProfileForm({ me }) {
  const setUsername = useSetUsername()
  const toast = useToast()
  const [username, setValue] = useState(me.username ?? '')
  const unchanged = username.trim().replace(/^@/, '').toLowerCase() === me.username

  function save(event) {
    event.preventDefault()
    setUsername.mutate(username, {
      onSuccess: (user) => toast(`Your username is now ${user.username}.`),
    })
  }

  const usernameError = fieldError(setUsername.error, 'username')

  return (
    <form onSubmit={save} noValidate className="flex max-w-md flex-col gap-6">
      <TextField label="Email" name="email" value={me.email} readOnly disabled />
      <TextField
        label="Username"
        name="username"
        autoComplete="username"
        required
        value={username}
        onChange={(event) => {
          setValue(event.target.value)
          if (setUsername.isError) setUsername.reset()
        }}
        hint={`3–20 characters: letters, numbers and underscores. ${changeHint(me)}`}
        error={usernameError}
      />
      {setUsername.isError && !usernameError && <FieldError role="alert">{errorMessage(setUsername.error)}</FieldError>}
      <div>
        <Button type="submit" loading={setUsername.isPending} disabled={unchanged} fullOnPhone>
          Save
        </Button>
      </div>
    </form>
  )
}

// US-03: Account settings, opened from the bottom of the sidebar. Sprint 2 has only the
// "Profile & security" tab (docs/ui-ux-guidelines.md); "Notifications & preferences" comes later.
export default function AccountSettingsPage() {
  const me = useMe()
  const crumbs = useBreadcrumb()
  useDocumentTitle('Account settings')

  if (!me.data) return <LoadingState />

  return (
    <section>
      <Breadcrumb items={crumbs} className="lg:hidden" />
      <h1 className="mt-2 text-title font-bold text-body lg:mt-0">Account settings</h1>
      <div className="mt-6 rounded-card border border-line bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-body">Profile &amp; security</h2>
        <p className="mt-1 mb-6 text-sm text-muted">Teammates find and invite you by your username.</p>
        <ProfileForm key={me.data.username} me={me.data} />
      </div>
    </section>
  )
}
