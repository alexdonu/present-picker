import { and, eq } from 'drizzle-orm'
import { MAX_PICK_QUANTITY, pickSchema } from '#shared/schemas'
import { picks, products } from '../../../db/schema'

// A guest picks a product. Picking a product you already picked (same person, same browser) adds to that pick
// instead of listing you twice.
export default defineEventHandler(async (event) => {
  const productId = getIdParam(event)
  const input = await readValidatedJson(event, pickSchema)

  const db = useDb()
  const product = db.select({ id: products.id }).from(products).where(eq(products.id, productId)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Produsul nu mai există.' })

  const ownerToken = ensureGuestToken(event)
  const sameName = (name: string) => name.toLocaleLowerCase('ro') === input.name.toLocaleLowerCase('ro')
  const existing = db
    .select()
    .from(picks)
    .where(and(eq(picks.productId, productId), eq(picks.ownerToken, ownerToken)))
    .all()
    .find((pick) => sameName(pick.guestName))

  if (existing) {
    db.update(picks)
      .set({
        quantity: Math.min(existing.quantity + input.quantity, MAX_PICK_QUANTITY),
        note: input.note ?? existing.note,
      })
      .where(eq(picks.id, existing.id))
      .run()
  } else {
    db.insert(picks)
      .values({ productId, guestName: input.name, quantity: input.quantity, note: input.note ?? null, ownerToken })
      .run()
  }

  setResponseStatus(event, 201)
  return { ok: true }
})
