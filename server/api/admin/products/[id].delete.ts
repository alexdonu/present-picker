import { eq } from 'drizzle-orm'
import { products } from '../../../db/schema'

// Also deletes the product's picks (foreign key cascade) and its photo, if it had one.
export default defineEventHandler((event) => {
  const id = getIdParam(event)
  const db = useDb()

  const product = db.select().from(products).where(eq(products.id, id)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Produsul nu există.' })

  db.delete(products).where(eq(products.id, id)).run()
  deleteImage(product.imageId)
  return { ok: true }
})
