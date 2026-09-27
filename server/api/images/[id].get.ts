import { eq } from 'drizzle-orm'
import { images } from '../../db/schema'

// Serves images stored in the database: product photos and the hero image. An id's content never changes after
// it is created (a replacement always gets a new id), so the response can be cached forever.
export default defineEventHandler((event) => {
  const image = useDb().select().from(images).where(eq(images.id, getIdParam(event))).get()
  if (!image) throw createError({ statusCode: 404, message: 'Imaginea nu există.' })

  setHeaders(event, {
    'Content-Type': image.contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  return image.data
})
