import type { H3Event } from 'h3'
import { productSchema } from '#shared/schemas'

/** Reads the admin's product form (multipart, because it can carry an image file) and validates its fields. */
export async function readProductForm(event: H3Event) {
  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, message: 'Formular invalid.' })

  const fields: Record<string, string> = {}
  let file: Buffer | undefined
  for (const part of parts) {
    if (!part.name) continue
    if (part.filename) {
      if (part.data.length > 0) file = part.data
    } else {
      fields[part.name] = part.data.toString('utf8')
    }
  }

  return { input: validate(productSchema, fields), file }
}
