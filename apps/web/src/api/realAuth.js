// US-01 Create an account and US-02 Sign in, using Supabase Auth email codes and the
// Express API (GET and PATCH /api/me). Same function names and results as the sample
// versions in mockServer.js, so the screens and hooks do not change.
import { ApiError } from './errors.js'
import { apiUrl } from './config.js'
import { adoptUser } from './mockServer.js'
import { rememberReturnTo } from './returnTo.js'
import { cachedAccessToken, supabase } from './supabase.js'

const PENDING_EMAIL_KEY = 'khatet.pendingEmail'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function invalid(field, message) {
  return new ApiError({ code: 'VALIDATION_FAILED', status: 422, message, fieldErrors: [{ field, message }] })
}

function rememberEmail(email) {
  try {
    if (email) globalThis.sessionStorage?.setItem(PENDING_EMAIL_KEY, email)
    else globalThis.sessionStorage?.removeItem(PENDING_EMAIL_KEY)
  } catch {
    // Storage can be unavailable (private mode); the code page then asks for the email again.
  }
}

function pendingEmail() {
  try {
    return globalThis.sessionStorage?.getItem(PENDING_EMAIL_KEY) ?? null
  } catch {
    return null
  }
}

// The API runs on Render's free plan, which sleeps after 15 minutes without traffic and
// takes up to a minute to wake. A cheap unauthenticated health request starts that
// wake-up early (on page load and when a code is requested), so by the time the user
// is signed in or has typed the code, GET /api/me does not wait on a cold server.
export function warmUpApi() {
  if (!apiUrl) return
  fetch(`${apiUrl}/api/health`, { cache: 'no-store' }).catch(() => {
    // Only a head start; the real request reports any failure.
  })
}

// Calls the Express API with the signed-in user's token and turns its error shape
// (docs/api-contract.md, Errors) into an ApiError.
// When the session has expired, the user is signed out here and sent to sign in, and comes back
// to this page afterwards (review H4 and M1). /me handles its own 401 during sign-in.
let endingSession = false
async function endSession() {
  if (endingSession) return
  endingSession = true
  rememberReturnTo(`${window.location.pathname}${window.location.search}`)
  await supabase().auth.signOut({ scope: 'local' }).catch(() => {})
  adoptUser(null)
  window.location.replace('/sign-in')
}

export async function apiFetch(path, { method = 'GET', body, keepalive = false } = {}) {
  // A keepalive request is sent as the page closes, so it uses the token in memory and calls fetch
  // without an await first; a closing page may not run code after one (iPhone Safari).
  const token =
    keepalive && cachedAccessToken() ? cachedAccessToken() : (await supabase().auth.getSession()).data.session?.access_token
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${apiUrl}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
    })
  } catch {
    throw new ApiError({ code: 'NETWORK', status: 0, message: 'Khatet could not be reached. Check your connection and try again.' })
  }

  if (response.status === 401 && token && path !== '/me') endSession()
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = payload?.error ?? {}
    throw new ApiError({
      code: error.code ?? 'REQUEST_FAILED',
      status: response.status,
      message: error.message ?? 'Something went wrong. Try again.',
      fieldErrors: error.fieldErrors ?? [],
    })
  }
  return payload
}

export async function requestCode(email) {
  const value = (email ?? '').trim().toLowerCase()
  if (!EMAIL_PATTERN.test(value)) throw invalid('email', 'Enter an email address, for example name@example.com.')

  const { error } = await supabase().auth.signInWithOtp({ email: value, options: { shouldCreateUser: true } })
  if (error) {
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      throw new ApiError({ code: 'RATE_LIMITED', status: 429, message: 'Too many codes were requested. Wait a minute and try again.' })
    }
    if (error.code === 'email_address_invalid' || error.code === 'validation_failed') {
      throw invalid('email', 'Enter an email address, for example name@example.com.')
    }
    throw new ApiError({ code: 'CODE_NOT_SENT', status: error.status ?? 500, message: 'The code could not be sent. Try again.' })
  }
  rememberEmail(value)
  warmUpApi()
  return { email: value }
}

export async function verifyCode(code) {
  const email = pendingEmail()
  if (!email) throw new ApiError({ code: 'CODE_NOT_REQUESTED', message: 'Request a code first.' })
  if (!/^\d{6}$/.test(code ?? '')) throw invalid('code', 'Enter the 6-digit code.')

  // A code works only once. If it was already accepted but loading the account failed,
  // a second try uses the session it gave instead of sending the used code again.
  const { data } = await supabase().auth.getSession()
  if (data.session?.user?.email?.toLowerCase() !== email) {
    const { error } = await supabase().auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) {
      // Supabase uses the same answer for a wrong code and an expired one.
      throw invalid('code', 'That code is wrong or has expired. Check the email or request a new code.')
    }
  }
  // The first request after sign-up creates the Khatet account (username still empty).
  let user
  try {
    user = await apiFetch('/me')
  } catch (error) {
    if (error.status === 401) throw error
    throw new ApiError({
      code: 'ACCOUNT_NOT_LOADED',
      status: error.status,
      message: 'Your code was accepted, but your Khatet account could not be loaded. Try again in a moment.',
    })
  }
  rememberEmail(null)
  adoptUser(user)
  return user
}

export async function getMe() {
  const { data } = await supabase().auth.getSession()
  if (!data.session) {
    adoptUser(null)
    return null
  }
  try {
    const user = await apiFetch('/me')
    adoptUser(user)
    return user
  } catch (error) {
    if (error.status === 401) {
      await supabase().auth.signOut({ scope: 'local' })
      adoptUser(null)
      return null
    }
    throw error
  }
}

export async function setUsername(username) {
  const user = await apiFetch('/me', { method: 'PATCH', body: { username } })
  adoptUser(user)
  return user
}

export async function signOut() {
  await supabase().auth.signOut({ scope: 'local' })
  adoptUser(null)
  return null
}
