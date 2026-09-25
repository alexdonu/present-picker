import { eq } from 'drizzle-orm'
import { identitySchema } from '#shared/schemas'
import { guests } from '../db/schema'

// The visitor chooses who they are from the guest list.
export default defineEventHandler(async (event) => {
  const { guestId } = await readValidatedJson(event, identitySchema)

  const guest = useDb().select({ id: guests.id, name: guests.name }).from(guests).where(eq(guests.id, guestId)).get()
  if (!guest) throw createError({ statusCode: 404, message: 'Nu găsesc acest invitat în listă.' })

  rememberGuest(event, guest)
  return { guest }
})
