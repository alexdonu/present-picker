import type { H3Event } from 'h3'

/** Reads a single uploaded image from a multipart form (used by the admin's "hero image" setting). */
export async function readImageFile(event: H3Event) {
  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.filename && part.data.length > 0)
  if (!file) throw createError({ statusCode: 400, message: 'Alege o imagine.' })
  return file.data
}
