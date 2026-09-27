import { eq } from 'drizzle-orm'
import { settings } from '../../../db/schema'

// Sets (or replaces) the hero image, shown on the guest page instead of the default decorative art.
export default defineEventHandler(async (event) => {
  const imageId = saveImage(await readImageFile(event))

  const db = useDb()
  const current = db.select().from(settings).get()
  db.update(settings).set({ heroImageId: imageId }).where(eq(settings.id, 1)).run()
  deleteImage(current?.heroImageId)

  return { heroImageUrl: imageUrl(imageId) }
})
