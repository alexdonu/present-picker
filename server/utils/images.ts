import { eq } from 'drizzle-orm'
import { images } from '../db/schema'

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const MAGIC_BYTES: [check: (data: Buffer) => boolean, contentType: string][] = [
  [(data) => data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])), 'image/jpeg'],
  [(data) => data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png'],
  [(data) => data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP', 'image/webp'],
  [(data) => data.subarray(0, 4).toString('latin1') === 'GIF8', 'image/gif'],
]

/** Detects the image type from its first bytes; the browser-reported type is not trusted. */
function sniffContentType(data: Buffer) {
  return MAGIC_BYTES.find(([check]) => check(data))?.[1]
}

/** Stores an uploaded image as a row in the database and returns its id. */
export function saveImage(data: Buffer) {
  if (data.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, message: 'Imaginea este prea mare (maxim 8 MB).' })
  }
  const contentType = sniffContentType(data)
  if (!contentType) {
    throw createError({ statusCode: 400, message: 'Imaginea trebuie să fie JPG, PNG, WebP sau GIF.' })
  }
  return useDb().insert(images).values({ data, contentType }).returning({ id: images.id }).get().id
}

/** Deletes a stored image by id. Safe to call with `null`/`undefined`. */
export function deleteImage(id: number | null | undefined) {
  if (id != null) useDb().delete(images).where(eq(images.id, id)).run()
}

/** The URL an image (a product photo or the hero image) is served from. */
export const imageUrl = (id: number) => `/api/images/${id}`
