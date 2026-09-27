import { eq } from 'drizzle-orm'
import { products } from '../../../db/schema'

export default defineEventHandler((event) => {
  const product = useDb().select().from(products).where(eq(products.id, getIdParam(event))).get()
  if (!product) throw createError({ statusCode: 404, message: 'Produsul nu există.' })

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    link: product.link,
    price: product.price,
    image: product.imageId ? imageUrl(product.imageId) : product.imageUrl,
    neededQuantity: product.neededQuantity,
  }
})
