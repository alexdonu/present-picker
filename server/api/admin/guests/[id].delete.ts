import { eq } from 'drizzle-orm'
import { guests } from '../../../db/schema'

// Removes a guest from the list, together with their picks (foreign key cascade).
export default defineEventHandler((event) => {
  const result = useDb().delete(guests).where(eq(guests.id, getIdParam(event))).run()
  if (result.changes === 0) throw createError({ statusCode: 404, message: 'Invitatul nu există.' })
  return { ok: true }
})
