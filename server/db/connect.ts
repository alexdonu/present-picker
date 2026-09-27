import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}
const LEGACY_UPLOAD_PATH = /^\/uploads\/([a-f0-9]{32}\.(jpg|png|webp|gif))$/

/**
 * Finishes migration 0002 (see drizzle/0002_image_blobs.sql): moves `products.image` values from before images
 * lived in the database — remote URLs, and local `/uploads/<file>` paths — into `image_url` / `image_id`, then
 * drops the now-unused `image` column. A plain SQL migration cannot read an uploaded file's bytes off disk,
 * which is why this last step of the migration runs here instead.
 *
 * Idempotent and safe to call on every startup: once the `image` column is gone, it does nothing.
 */
function migrateLegacyFileImages(sqlite: Database.Database, directory: string) {
  const hasLegacyColumn = sqlite.prepare("SELECT 1 FROM pragma_table_info('products') WHERE name = 'image'").get()
  if (!hasLegacyColumn) return
  // Defensive: `migrate()` (called right before this, in every `openDatabase()`) always applies every migration up
  // to and including this one in the same call, so `images` exists by now — except if the migrations folder itself
  // is incomplete, in which case there is nothing safe to do until it is fixed.
  const hasImagesTable = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'images'").get()
  if (!hasImagesTable) return

  const rows = sqlite.prepare('SELECT id, image FROM products WHERE image IS NOT NULL').all() as {
    id: number
    image: string
  }[]

  const insertImage = sqlite.prepare('INSERT INTO images (data, content_type) VALUES (?, ?)')
  const setImageId = sqlite.prepare('UPDATE products SET image_id = ? WHERE id = ?')
  const setImageUrl = sqlite.prepare('UPDATE products SET image_url = ? WHERE id = ?')

  for (const row of rows) {
    if (/^https?:\/\//i.test(row.image)) {
      setImageUrl.run(row.image, row.id)
      continue
    }

    const match = LEGACY_UPLOAD_PATH.exec(row.image)
    if (!match) continue // an unrecognised value: leave this product without an image rather than guess

    let data: Buffer
    try {
      data = readFileSync(join(directory, 'uploads', match[1]!))
    } catch {
      console.error(`[present-picker] Could not read ${row.image} for product ${row.id}; its picture was dropped.`)
      continue
    }

    const { lastInsertRowid } = insertImage.run(data, CONTENT_TYPE_BY_EXTENSION[match[2]!])
    setImageId.run(Number(lastInsertRowid), row.id)
  }

  sqlite.exec('ALTER TABLE products DROP COLUMN image')
  // Nothing else in the app writes there any more.
  rmSync(join(directory, 'uploads'), { recursive: true, force: true })
}

/**
 * Opens the SQLite database stored in `directory` (creating it if needed) and applies pending migrations.
 * Shared by the server and by scripts (see `scripts/seed.ts`), so both always see the same schema.
 */
export function openDatabase(directory: string) {
  mkdirSync(directory, { recursive: true })

  const sqlite = new Database(join(directory, 'present-picker.db'))
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const database = drizzle(sqlite, { schema })
  // The `drizzle/` folder ships with the project; run the app from the project root (`npm start`).
  migrate(database, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  migrateLegacyFileImages(sqlite, directory)

  return database
}
