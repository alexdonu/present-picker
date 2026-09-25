import { readdir, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import type { openDatabase } from '../../server/db/connect'
import { guests, picks, products } from '../../server/db/schema'

type Database = ReturnType<typeof openDatabase>

/** Where the app keeps its data: `./data`, or `NUXT_DATA_DIR` (also read from `.env`). */
export const dataDirectory = () => resolve(process.cwd(), process.env.NUXT_DATA_DIR ?? './data')

export const databaseFile = (directory: string) => join(directory, 'present-picker.db')

// Same file-name shape the app gives to uploaded images. Anything else in the folder is left alone.
const UPLOAD_FILE = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/

async function uploadedImages(directory: string) {
  try {
    return (await readdir(join(directory, 'uploads'))).filter((file) => UPLOAD_FILE.test(file))
  } catch {
    return [] // no uploads folder yet
  }
}

export async function countData(db: Database, directory: string) {
  return {
    products: db.select().from(products).all().length,
    guests: db.select().from(guests).all().length,
    picks: db.select().from(picks).all().length,
    images: (await uploadedImages(directory)).length,
  }
}

/** Deletes every product, guest and pick and every uploaded image, and restarts the ids from 1. */
export async function wipeData(db: Database, directory: string) {
  const counts = await countData(db, directory)

  db.delete(picks).run()
  db.delete(guests).run()
  db.delete(products).run()
  db.run(sql`DELETE FROM sqlite_sequence WHERE name IN ('products', 'guests', 'picks')`)

  for (const file of await uploadedImages(directory)) {
    await rm(join(directory, 'uploads', file), { force: true })
  }
  return counts
}
