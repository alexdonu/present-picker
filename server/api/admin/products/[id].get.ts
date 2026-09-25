import { eq } from 'drizzle-orm'
import { products } from '../../../db/schema'

export default defineEventHandler((event) => {
  const product = useDb().select().from(products).where(eq(products.id, getIdParam(event))).get()
  if (!product) throw createError({ statusCode: 404, message: 'Produsul nu există.' })

  const { createdAt: _createdAt, ...fields } = product
  return fields
})
