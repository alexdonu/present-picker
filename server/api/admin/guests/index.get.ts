import { count } from 'drizzle-orm'
import type { AdminGuest } from '#shared/types/guest'
import { guests, picks } from '../../../db/schema'

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const db = useDb()

  const pickCounts = new Map(
    db.select({ guestId: picks.guestId, total: count() }).from(picks).groupBy(picks.guestId).all().map((row) => [row.guestId, row.total]),
  )
  return db
    .select({ id: guests.id, name: guests.name })
    .from(guests)
    .all()
    .map((guest): AdminGuest => ({ ...guest, pickCount: pickCounts.get(guest.id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
})
