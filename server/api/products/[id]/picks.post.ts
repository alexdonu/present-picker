import { and, eq } from 'drizzle-orm'
import { MAX_PICK_QUANTITY, pickSchema } from '#shared/schemas'
import { picks, products } from '../../../db/schema'

// The current guest picks a product. Picking a product they already picked adds to that pick,
// so a guest is never listed twice on the same product.
export default defineEventHandler(async (event) => {
  const guest = requireCurrentGuest(event)
  const productId = getIdParam(event)
  const input = await readValidatedJson(event, pickSchema)

  const db = useDb()
  const product = db.select({ id: products.id }).from(products).where(eq(products.id, productId)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Produsul nu mai există.' })

  const existing = db
    .select()
    .from(picks)
    .where(and(eq(picks.productId, productId), eq(picks.guestId, guest.id)))
    .get()

  if (existing) {
    db.update(picks)
      .set({
        quantity: Math.min(existing.quantity + input.quantity, MAX_PICK_QUANTITY),
        note: input.note ?? existing.note,
      })
      .where(eq(picks.id, existing.id))
      .run()
  } else {
    db.insert(picks).values({ productId, guestId: guest.id, quantity: input.quantity, note: input.note ?? null }).run()
  }

  setResponseStatus(event, 201)
  return { ok: true }
})
