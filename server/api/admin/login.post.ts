import { z } from 'zod'

const loginSchema = z.object({ password: z.string({ error: 'Scrie parola.' }).min(1, 'Scrie parola.') })

export default defineEventHandler(async (event) => {
  assertConfigured()
  const { password } = await readValidatedJson(event, loginSchema)

  if (!passwordMatches(password)) {
    // A pause on every wrong guess makes guessing the password far too slow to be worthwhile.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    throw createError({ statusCode: 401, message: 'Parolă greșită.' })
  }

  const session = await useAdminSession(event)
  await session.update({ admin: true })
  return { ok: true }
})
