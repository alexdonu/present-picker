import { guests } from '../../db/schema'

// The guest list, so visitors can choose who they are. Public on purpose: it is a group of friends.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return useDb()
    .select({ id: guests.id, name: guests.name })
    .from(guests)
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
})
