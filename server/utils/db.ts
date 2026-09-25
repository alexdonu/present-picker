import { openDatabase } from '../db/connect'

let db: ReturnType<typeof openDatabase> | undefined

/** The app database. Opened (and migrated) on first use. */
export function useDb() {
  db ??= openDatabase(dataDir())
  return db
}
