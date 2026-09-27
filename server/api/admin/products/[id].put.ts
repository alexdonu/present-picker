import { eq } from 'drizzle-orm'
import { products } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getIdParam(event)
  const db = useDb()

  const current = db.select().from(products).where(eq(products.id, id)).get()
  if (!current) throw createError({ statusCode: 404, message: 'Produsul nu există.' })

  const { input, file } = await readProductForm(event)

  // New upload > pasted address > "remove image" > keep what is there.
  let imageId = current.imageId
  let imageUrl = current.imageUrl
  if (file) {
    imageId = saveImage(file)
    imageUrl = null
  } else if (input.imageUrl) {
    imageId = null
    imageUrl = input.imageUrl
  } else if (input.removeImage) {
    imageId = null
    imageUrl = null
  }

  db.update(products)
    .set({
      name: input.name,
      description: input.description ?? null,
      link: input.link ?? null,
      price: input.price ?? null,
      imageId,
      imageUrl,
    })
    .where(eq(products.id, id))
    .run()

  if (current.imageId !== null && current.imageId !== imageId) deleteImage(current.imageId)
  return { id }
})
