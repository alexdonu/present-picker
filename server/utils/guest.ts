import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE = 'pp_guest'
const TOKEN_FORMAT = /^[a-f0-9]{48}$/

/**
 * Guests have no accounts. Instead, each browser gets a random token in a cookie, and the picks it makes
 * are tied to it: that is what lets a guest cancel their own picks (and only theirs) later.
 */
export function getGuestToken(event: H3Event) {
  const token = getCookie(event, COOKIE)
  return token && TOKEN_FORMAT.test(token) ? token : undefined
}

export function ensureGuestToken(event: H3Event) {
  let token = getGuestToken(event)
  if (!token) {
    token = randomBytes(24).toString('hex')
    setCookie(event, COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps(event),
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    })
  }
  return token
}
