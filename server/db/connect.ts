import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

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
  return database
}
