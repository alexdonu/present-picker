import { asc } from 'drizzle-orm'
import type { PublicPick, PublicProduct } from '#shared/types/product'
import { picks, products } from '../db/schema'

/**
 * Every product with the picks made on it, in a shape that is safe to send to browsers.
 * `viewerToken` is the visitor's guest token, used only to flag their own picks; tokens themselves never leave the server.
 */
export function loadProducts(viewerToken?: string): PublicProduct[] {
  const db = useDb()
  const allProducts = db.select().from(products).orderBy(asc(products.createdAt), asc(products.id)).all()
  const allPicks = db.select().from(picks).orderBy(asc(picks.createdAt), asc(picks.id)).all()

  const picksByProduct = new Map<number, PublicPick[]>()
  for (const pick of allPicks) {
    const list = picksByProduct.get(pick.productId) ?? []
    list.push({
      id: pick.id,
      guestName: pick.guestName,
      quantity: pick.quantity,
      note: pick.note,
      mine: viewerToken !== undefined && pick.ownerToken === viewerToken,
    })
    picksByProduct.set(pick.productId, list)
  }

  return allProducts.map((product) => {
    const productPicks = picksByProduct.get(product.id) ?? []
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      link: product.link,
      price: product.price,
      image: product.image,
      totalQuantity: productPicks.reduce((sum, pick) => sum + pick.quantity, 0),
      picks: productPicks,
    }
  })
}
