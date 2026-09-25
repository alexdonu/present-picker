/**
 * Shows what the database holds, to check it is clean before going live. It only reads: it never changes anything
 * (not even by creating a missing database or applying migrations).
 *
 *   npm run db:status                  prints the counts
 *   npm run db:status -- --expect-clean   also exits with an error if there is any data (for deploy scripts)
 *
 * It looks at the same database as the app: `./data`, or `NUXT_DATA_DIR` (also read from `.env`).
 */
import { existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import { databaseFile, dataDirectory, uploadedImages } from './lib/data'

async function main() {
  const directory = dataDirectory()
  const file = databaseFile(directory)
  console.log(`Database: ${file}`)

  const images = (await uploadedImages(directory)).length
  const counts: Record<string, number | undefined> = { products: undefined, guests: undefined, picks: undefined }

  if (existsSync(file)) {
    const db = new Database(file, { readonly: true, fileMustExist: true })
    const tables = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name),
    )
    for (const table of Object.keys(counts)) {
      // A table can be missing when the database is older than the code (it is migrated the next time the app starts).
      if (tables.has(table)) counts[table] = (db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }).total
    }
    db.close()
  } else {
    console.log('There is no database here yet. It is created, empty, the first time the app starts.')
  }

  for (const [table, total] of Object.entries(counts)) console.log(`  ${table.padEnd(16)}${total ?? '-'}`)
  console.log(`  ${'uploaded images'.padEnd(16)}${images}`)

  const holdsData = images > 0 || Object.values(counts).some((total) => (total ?? 0) > 0)
  console.log(holdsData ? '\nThe database holds data (it is NOT clean).' : '\nClean: there is no data at all.')
  if (holdsData && process.argv.includes('--expect-clean')) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
