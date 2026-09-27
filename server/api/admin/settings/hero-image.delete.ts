import { eq } from 'drizzle-orm'
import { settings } from '../../../db/schema'

// Removes the hero image; the guest page falls back to the default decorative art.
export default defineEventHandler((event) => {
  const db = useDb()
  const current = db.select().from(settings).get()
  db.update(settings).set({ heroImageId: null }).where(eq(settings.id, 1)).run()
  deleteImage(current?.heroImageId)

  return { heroImageUrl: null }
})
