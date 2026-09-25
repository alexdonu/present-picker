import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const TWO_WEEKS = 60 * 60 * 24 * 14

/** Cookies are only marked `Secure` when the visitor really is on https (also behind a reverse proxy). */
export function isHttps(event: H3Event) {
  return getRequestProtocol(event, { xForwardedProto: true }) === 'https'
}

export function useAdminSession(event: H3Event) {
  assertConfigured()
  return useSession<{ admin?: boolean }>(event, {
    name: 'pp_admin',
    password: useRuntimeConfig(event).sessionSecret,
    maxAge: TWO_WEEKS,
    cookie: { httpOnly: true, sameSite: 'lax', secure: isHttps(event), path: '/' },
  })
}

export async function isAdmin(event: H3Event) {
  const session = await useAdminSession(event)
  return session.data.admin === true
}

export async function requireAdmin(event: H3Event) {
  if (!(await isAdmin(event))) {
    throw createError({ statusCode: 401, message: 'Trebuie să te autentifici ca administrator.' })
  }
}

/** Compares in constant time, so the response time does not leak how much of the password matched. */
export function passwordMatches(candidate: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(candidate), digest(useRuntimeConfig().adminPassword))
}
