import { asc, eq } from 'drizzle-orm'
import type { PublicPick, PublicProduct } from '#shared/types/product'
import { guests, picks, products } from '../db/schema'

/**
 * Every product with the picks made on it, in a shape that is safe to send to browsers.
 * `viewerGuestId` is the guest the visitor chose to be; it flags their own picks (`mine`) and, since a phone
 * number is only shown once someone has said who they are, gates every pick's `phone` on it too.
 */
export function loadProducts(viewerGuestId?: number): PublicProduct[] {
  const db = useDb()
  const allProducts = db.select().from(products).orderBy(asc(products.createdAt), asc(products.id)).all()
  const allPicks = db
    .select({
      id: picks.id,
      productId: picks.productId,
      guestId: picks.guestId,
      guestName: guests.name,
      guestPhone: guests.phone,
      quantity: picks.quantity,
      note: picks.note,
    })
    .from(picks)
    .innerJoin(guests, eq(guests.id, picks.guestId))
    .orderBy(asc(picks.createdAt), asc(picks.id))
    .all()

  const picksByProduct = new Map<number, PublicPick[]>()
  for (const pick of allPicks) {
    const list = picksByProduct.get(pick.productId) ?? []
    list.push({
      id: pick.id,
      guestName: pick.guestName,
      quantity: pick.quantity,
      note: pick.note,
      mine: viewerGuestId !== undefined && pick.guestId === viewerGuestId,
      phone: viewerGuestId !== undefined ? pick.guestPhone : null,
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
      image: product.imageId ? imageUrl(product.imageId) : product.imageUrl,
      totalQuantity: productPicks.reduce((sum, pick) => sum + pick.quantity, 0),
      neededQuantity: product.neededQuantity,
      picks: productPicks,
    }
  })
}
