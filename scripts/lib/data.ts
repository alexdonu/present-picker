import { join, resolve } from 'node:path'
import { ne, sql } from 'drizzle-orm'
import type { openDatabase } from '../../server/db/connect'
import { guests, images, picks, products, settings } from '../../server/db/schema'

type Database = ReturnType<typeof openDatabase>

/** Where the app keeps its data: `./data`, or `NUXT_DATA_DIR` (also read from `.env`). */
export const dataDirectory = () => resolve(process.cwd(), process.env.NUXT_DATA_DIR ?? './data')

export const databaseFile = (directory: string) => join(directory, 'present-picker.db')

const heroImageId = (db: Database) => db.select().from(settings).get()?.heroImageId ?? null

/**
 * Product photos and guest picks, guests and products themselves — everything that counts as "data" rather than
 * site configuration. The hero image (a deliberate admin setting, not sample data) is not included.
 */
export function countData(db: Database) {
  const hero = heroImageId(db)
  return {
    products: db.select().from(products).all().length,
    guests: db.select().from(guests).all().length,
    picks: db.select().from(picks).all().length,
    images: hero ? db.select().from(images).where(ne(images.id, hero)).all().length : db.select().from(images).all().length,
  }
}

/**
 * Deletes every product, guest, pick and product photo, and restarts the ids from 1. The hero image, if one is
 * set, is kept — it is a deliberate admin setting, not sample data.
 */
export function wipeData(db: Database) {
  const counts = countData(db)
  const hero = heroImageId(db)

  db.delete(picks).run()
  db.delete(guests).run()
  db.delete(products).run()
  if (hero) db.delete(images).where(ne(images.id, hero)).run()
  else db.delete(images).run()
  db.run(sql`DELETE FROM sqlite_sequence WHERE name IN ('products', 'guests', 'picks')`)

  return counts
}
