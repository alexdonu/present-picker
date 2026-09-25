import { eq } from 'drizzle-orm'
import { products } from '../../../db/schema'

// Also deletes the product's picks (foreign key cascade) and its uploaded image.
export default defineEventHandler(async (event) => {
  const id = getIdParam(event)
  const db = useDb()

  const product = db.select().from(products).where(eq(products.id, id)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Produsul nu există.' })

  db.delete(products).where(eq(products.id, id)).run()
  await removeUpload(product.image)
  return { ok: true }
})
