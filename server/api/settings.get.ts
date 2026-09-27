import { settings } from '../db/schema'

// Site-wide settings a visitor's browser needs. Currently just the hero image, when the admins configured one.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const row = useDb().select().from(settings).get()
  return { heroImageUrl: row?.heroImageId ? imageUrl(row.heroImageId) : null }
})
