import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import type { Guest } from '#shared/types/guest'
import { guests } from '../db/schema'

const COOKIE = 'pp_guest'

/**
 * Visitors say who they are by choosing a name from the guest list; the choice is remembered in a cookie.
 * There is deliberately no password: it is a group of friends, and anyone may choose anyone (which is also how
 * someone picks their own name again on a second device). The cookie only holds the guest's id.
 */
export function rememberGuest(event: H3Event, guest: Guest) {
  setCookie(event, COOKIE, String(guest.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(event),
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  })
}

export function forgetGuest(event: H3Event) {
  deleteCookie(event, COOKIE, { path: '/' })
}

/** The guest this browser chose to be, or undefined if none was chosen or they were removed from the list. */
export function getCurrentGuest(event: H3Event): Guest | undefined {
  const value = getCookie(event, COOKIE)
  if (!value || !/^\d{1,9}$/.test(value)) return undefined
  return useDb().select({ id: guests.id, name: guests.name }).from(guests).where(eq(guests.id, Number(value))).get()
}

export function requireCurrentGuest(event: H3Event) {
  const guest = getCurrentGuest(event)
  if (!guest) throw createError({ statusCode: 401, message: 'Alege mai întâi cine ești din lista de invitați.' })
  return guest
}
