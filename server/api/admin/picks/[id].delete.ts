import { eq } from 'drizzle-orm'
import { picks } from '../../../db/schema'

// Admins can remove any guest's pick.
export default defineEventHandler((event) => {
  const result = useDb().delete(picks).where(eq(picks.id, getIdParam(event))).run()
  if (result.changes === 0) throw createError({ statusCode: 404, message: 'Alegerea nu mai există.' })
  return { ok: true }
})
