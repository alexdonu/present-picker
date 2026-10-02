import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const TWO_WEEKS = 60 * 60 * 24 * 14

/**
 * Access to the MIC2 webhook playground (/admin/mic2) for someone who must not see the party admin: its own
 * login and password (NUXT_MIC2_LOGIN, NUXT_MIC2_PASSWORD) and its own session cookie. A party admin gets in too.
 * Messages are in English, like everything else in the playground.
 */
export function mic2AccessConfigured() {
  const { mic2Login, mic2Password, sessionSecret } = useRuntimeConfig()
  return Boolean(mic2Login && mic2Password && sessionSecret.length >= 32)
}

export function useMic2Session(event: H3Event) {
  if (useRuntimeConfig(event).sessionSecret.length < 32) {
    throw createError({ statusCode: 503, message: 'The server is not configured (NUXT_SESSION_SECRET).' })
  }
  return useSession<{ mic2?: boolean }>(event, {
    name: 'pp_mic2',
    password: useRuntimeConfig(event).sessionSecret,
    maxAge: TWO_WEEKS,
    cookie: { httpOnly: true, sameSite: 'lax', secure: isHttps(event), path: '/' },
  })
}

export async function isMic2Viewer(event: H3Event) {
  if (mic2AccessConfigured() && (await useMic2Session(event)).data.mic2 === true) return true
  // isAdmin() throws when the party admin is not configured; then there is simply no admin to let in.
  return configProblems().length === 0 && (await isAdmin(event))
}

export async function requireMic2Viewer(event: H3Event) {
  if (!(await isMic2Viewer(event))) throw createError({ statusCode: 401, message: 'Please sign in.' })
}

/** Both compared in constant time; the login ignores case, since it is an email address. */
export function mic2CredentialsMatch(login: string, password: string) {
  const { mic2Login, mic2Password } = useRuntimeConfig()
  const digest = (value: string) => createHash('sha256').update(value).digest()
  const loginOk = timingSafeEqual(digest(login.trim().toLowerCase()), digest(mic2Login.trim().toLowerCase()))
  const passwordOk = timingSafeEqual(digest(password), digest(mic2Password))
  return loginOk && passwordOk
}
