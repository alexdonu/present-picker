import { eq } from 'drizzle-orm'
import { picks } from '../../db/schema'

// A guest cancels one of their own picks. Ownership is proven by the token in their cookie.
export default defineEventHandler((event) => {
  const id = getIdParam(event)
  const db = useDb()

  const pick = db.select().from(picks).where(eq(picks.id, id)).get()
  if (!pick) throw createError({ statusCode: 404, message: 'Alegerea nu mai există.' })
  if (pick.ownerToken !== getGuestToken(event)) {
    throw createError({ statusCode: 403, message: 'Poți anula doar alegerile făcute de tine, din acest telefon sau browser.' })
  }

  db.delete(picks).where(eq(picks.id, id)).run()
  return { ok: true }
})
