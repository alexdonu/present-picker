import { z } from 'zod'

const loginSchema = z.object({
  login: z.string({ error: 'Enter your login.' }).min(1, 'Enter your login.').max(320),
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(256),
})

export default defineEventHandler(async (event) => {
  if (!mic2AccessConfigured()) {
    throw createError({ statusCode: 503, message: 'Access to this page is not configured on the server.' })
  }
  const { login, password } = await readValidatedJson(event, loginSchema)

  if (!mic2CredentialsMatch(login, password)) {
    // A pause on every wrong guess makes guessing far too slow to be worthwhile.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    throw createError({ statusCode: 401, message: 'Wrong login or password.' })
  }

  const session = await useMic2Session(event)
  await session.update({ mic2: true })
  return { ok: true }
})
