import { guests } from '../db/schema'

// The guest list with phone numbers, so guests can reach each other. Requires having chosen an identity first
// (the guest page also only fetches this once a name has been chosen, but the server is the real gate).
export default defineEventHandler((event) => {
  requireCurrentGuest(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return useDb()
    .select({ id: guests.id, name: guests.name, phone: guests.phone })
    .from(guests)
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
})
