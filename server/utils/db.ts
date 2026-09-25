import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../db/schema'

let db: ReturnType<typeof createDb> | undefined

function createDb() {
  const directory = dataDir()
  mkdirSync(directory, { recursive: true })

  const sqlite = new Database(join(directory, 'present-picker.db'))
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const database = drizzle(sqlite, { schema })
  // The `drizzle/` folder ships with the project; run the app from the project root (`npm start`).
  migrate(database, { migrationsFolder: resolve(process.cwd(), 'drizzle') })
  return database
}

/** The app database. Opened (and migrated) on first use. */
export function useDb() {
  db ??= createDb()
  return db
}
