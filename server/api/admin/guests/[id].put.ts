import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { guestNameSchema, guestPhoneSchema } from '#shared/schemas'
import { guests } from '../../../db/schema'

// Renames a guest and/or sets their phone number. Their picks follow automatically, because they point to the
// guest, not to the name.
export default defineEventHandler(async (event) => {
  const id = getIdParam(event)
  const { name, phone } = await readValidatedJson(event, z.object({ name: guestNameSchema, phone: guestPhoneSchema }))

  const db = useDb()
  if (!db.select({ id: guests.id }).from(guests).where(eq(guests.id, id)).get()) {
    throw createError({ statusCode: 404, message: 'Invitatul nu există.' })
  }
  const clash = db.select().from(guests).all().find((guest) => guest.id !== id && nameKey(guest.name) === nameKey(name))
  if (clash) throw createError({ statusCode: 409, message: 'Există deja un invitat cu acest nume.' })

  db.update(guests)
    .set({ name, phone: phone ?? null })
    .where(eq(guests.id, id))
    .run()
  return { id, name, phone: phone ?? null }
})
