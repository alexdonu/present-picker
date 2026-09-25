import { eq } from 'drizzle-orm'
import { products } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getIdParam(event)
  const db = useDb()

  const current = db.select().from(products).where(eq(products.id, id)).get()
  if (!current) throw createError({ statusCode: 404, message: 'Produsul nu există.' })

  const { input, file } = await readProductForm(event)

  // New upload > pasted address > "remove image" > keep what is there.
  let image = current.image
  if (file) image = await saveUpload(file)
  else if (input.imageUrl) image = input.imageUrl
  else if (input.removeImage) image = null

  db.update(products)
    .set({
      name: input.name,
      description: input.description ?? null,
      link: input.link ?? null,
      price: input.price ?? null,
      image,
    })
    .where(eq(products.id, id))
    .run()

  if (image !== current.image) await removeUpload(current.image)
  return { id }
})
