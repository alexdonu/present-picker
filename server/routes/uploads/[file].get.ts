import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

// Serves the images uploaded by admins. File names are random, so a given URL never changes content.
export default defineEventHandler(async (event) => {
  const file = getRouterParam(event, 'file') ?? ''
  // The strict pattern also rules out path traversal (`..`, slashes).
  if (!UPLOAD_FILE_NAME.test(file)) throw createError({ statusCode: 404, message: 'Imaginea nu există.' })

  let data: Buffer
  try {
    data = await readFile(join(uploadsDir(), file))
  } catch {
    throw createError({ statusCode: 404, message: 'Imaginea nu există.' })
  }

  setHeaders(event, {
    'Content-Type': CONTENT_TYPES[file.split('.')[1]!]!,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  })
  return data
})
