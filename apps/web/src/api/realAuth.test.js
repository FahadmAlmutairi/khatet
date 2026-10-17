import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = {
  getSession: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
}
vi.mock('./supabase.js', () => ({ supabase: () => ({ auth }) }))

const { requestCode, verifyCode, getMe, setUsername } = await import('./realAuth.js')

function respondWith(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })
}

const signedIn = { data: { session: { access_token: 'token-123' } } }
const user = { id: 'u-1', email: 'sara@example.com', username: null }

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  auth.getSession.mockResolvedValue(signedIn)
  auth.signInWithOtp.mockResolvedValue({ error: null })
  auth.verifyOtp.mockResolvedValue({ error: null })
  auth.signOut.mockResolvedValue({ error: null })
})

describe('real sign-in (US-01, US-02)', () => {
  it('asks Supabase to email a code, creating the account if needed', async () => {
    await expect(requestCode(' Sara@Example.com ')).resolves.toEqual({ email: 'sara@example.com' })
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'sara@example.com', options: { shouldCreateUser: true } })
  })

  it('refuses an email address with the wrong format before calling Supabase', async () => {
    await expect(requestCode('not-an-email')).rejects.toMatchObject({ fieldErrors: [{ field: 'email' }] })
    expect(auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('explains when too many codes were requested', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { status: 429, code: 'over_email_send_rate_limit' } })
    await expect(requestCode('sara@example.com')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('checks the code with Supabase, then loads the Khatet account with the token', async () => {
    await requestCode('sara@example.com')
    respondWith(200, user)
    await expect(verifyCode('123456')).resolves.toEqual(user)
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'sara@example.com', token: '123456', type: 'email' })
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-123')
  })

  it('rejects a wrong or expired code with a message on the code field', async () => {
    await requestCode('sara@example.com')
    auth.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } })
    await expect(verifyCode('000000')).rejects.toMatchObject({ fieldErrors: [{ field: 'code' }] })
  })

  it('keeps the sign-in when the code is accepted but the account cannot be loaded, then retries without the used code', async () => {
    await requestCode('sara@example.com')
    respondWith(500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Try again.' } })
    await expect(verifyCode('123456')).rejects.toMatchObject({ code: 'ACCOUNT_NOT_LOADED', fieldErrors: [] })
    expect(auth.verifyOtp).toHaveBeenCalledTimes(1)

    // Supabase now has a session for this email, so the second try only loads the account.
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-123', user: { email: 'sara@example.com' } } } })
    respondWith(200, user)
    await expect(verifyCode('123456')).resolves.toEqual(user)
    expect(auth.verifyOtp).toHaveBeenCalledTimes(1)
  })

  it('returns no user when nobody is signed in', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(getMe()).resolves.toBeNull()
  })

  it('signs out locally when the API no longer accepts the token', async () => {
    respondWith(401, { error: { code: 'UNAUTHENTICATED', message: 'Your session has ended. Sign in again.' } })
    await expect(getMe()).resolves.toBeNull()
    expect(auth.signOut).toHaveBeenCalled()
  })

  it('shows the API message when a username is taken', async () => {
    respondWith(422, {
      error: { code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.', fieldErrors: [{ field: 'username', message: 'sara is taken. Try another username.' }] },
    })
    await expect(setUsername('sara')).rejects.toMatchObject({ fieldErrors: [{ field: 'username', message: 'sara is taken. Try another username.' }] })
  })
})
