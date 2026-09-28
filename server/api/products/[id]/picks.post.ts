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
  const product = db.select({ id: products.id, neededQuantity: products.neededQuantity }).from(products).where(eq(products.id, productId)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Produsul nu mai există.' })

  // Nothing here runs `await` past this point, so no other request's picks can land in between this check and
  // the write below — the two together are effectively one atomic step.
  if (product.neededQuantity !== null) {
    const pickedSoFar = db
      .select({ quantity: picks.quantity })
      .from(picks)
      .where(eq(picks.productId, productId))
      .all()
      .reduce((sum, pick) => sum + pick.quantity, 0)
    const remaining = product.neededQuantity - pickedSoFar
    if (remaining <= 0) {
      throw createError({ statusCode: 409, message: 'Nevoia pentru acest cadou este deja acoperită.' })
    }
    // Reject outright rather than silently capping the quantity: the guest asked for a specific number, and
    // capping it without saying so would leave them thinking they got what they asked for.
    if (input.quantity > remaining) {
      throw createError({
        statusCode: 409,
        message: remaining === 1 ? 'Mai este necesară doar 1 bucată.' : `Mai sunt necesare doar ${remaining} bucăți.`,
      })
    }
  }

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
