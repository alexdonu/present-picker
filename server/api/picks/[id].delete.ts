import { eq } from 'drizzle-orm'
import { picks } from '../../db/schema'

// A guest cancels one of their own picks. "Own" means made by the guest this browser chose to be:
// someone who picks the same name on another device can cancel it there too.
export default defineEventHandler((event) => {
  const id = getIdParam(event)
  const db = useDb()

  const pick = db.select().from(picks).where(eq(picks.id, id)).get()
  if (!pick) throw createError({ statusCode: 404, message: 'Alegerea nu mai există.' })
  if (pick.guestId !== getCurrentGuest(event)?.id) {
    throw createError({ statusCode: 403, message: 'Poți anula doar alegerile făcute de tine. Verifică dacă ai ales numele potrivit.' })
  }

  db.delete(picks).where(eq(picks.id, id)).run()
  return { ok: true }
})
