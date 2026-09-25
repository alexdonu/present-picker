import { randomBytes } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const UPLOADS_URL_PREFIX = '/uploads/'
export const UPLOAD_FILE_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export const uploadsDir = () => join(dataDir(), 'uploads')

/** Detects the image type from its first bytes; the browser-reported type is not trusted. */
function sniffExtension(data: Buffer) {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg'
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (data.subarray(0, 4).toString('latin1') === 'RIFF' && data.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  if (data.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif'
  return undefined
}

/** Stores an uploaded image and returns the public path it will be served from. */
export async function saveUpload(data: Buffer) {
  if (data.length > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, message: 'Imaginea este prea mare (maxim 8 MB).' })
  }
  const extension = sniffExtension(data)
  if (!extension) {
    throw createError({ statusCode: 400, message: 'Imaginea trebuie să fie JPG, PNG, WebP sau GIF.' })
  }

  const fileName = `${randomBytes(16).toString('hex')}.${extension}`
  await mkdir(uploadsDir(), { recursive: true })
  await writeFile(join(uploadsDir(), fileName), data)
  return UPLOADS_URL_PREFIX + fileName
}

/** Deletes a previously uploaded image. Ignores remote URLs and files that are already gone. */
export async function removeUpload(image: string | null | undefined) {
  if (!image?.startsWith(UPLOADS_URL_PREFIX)) return
  const fileName = image.slice(UPLOADS_URL_PREFIX.length)
  if (!UPLOAD_FILE_NAME.test(fileName)) return
  await rm(join(uploadsDir(), fileName), { force: true })
}
