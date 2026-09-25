import { z } from 'zod'
import { guests } from '../../../db/schema'

const schema = z.object({ names: z.string({ error: 'Scrie cel puțin un nume.' }) })

// Adds guests from text with one name per line. Names that are already on the list are skipped, not duplicated.
export default defineEventHandler(async (event) => {
  const { names } = await readValidatedJson(event, schema)
  const wanted = parseGuestNames(names)

  const db = useDb()
  const existing = new Set(db.select({ name: guests.name }).from(guests).all().map((guest) => nameKey(guest.name)))

  const added: string[] = []
  const skipped: string[] = []
  for (const name of wanted) {
    if (existing.has(nameKey(name))) {
      skipped.push(name)
      continue
    }
    db.insert(guests).values({ name }).run()
    added.push(name)
  }

  setResponseStatus(event, 201)
  return { added, skipped }
})
