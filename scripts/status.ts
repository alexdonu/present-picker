/**
 * Shows what the database holds, to check it is clean before going live. It only reads: it never changes anything
 * (not even by creating a missing database or applying migrations).
 *
 *   npm run db:status                  prints the counts
 *   npm run db:status -- --expect-clean   also exits with an error if there is any data (for deploy scripts)
 *
 * It looks at the same database as the app: `./data`, or `NUXT_DATA_DIR` (also read from `.env`).
 * The hero image doesn't count as "data" here: it is a deliberate admin setting (like the party's date, in
 * app.config.ts), not sample content that a clean start should be free of.
 */
import { existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import { databaseFile, dataDirectory } from './lib/data'

async function main() {
  const directory = dataDirectory()
  const file = databaseFile(directory)
  console.log(`Database: ${file}`)

  const counts: Record<string, number | undefined> = { products: undefined, guests: undefined, picks: undefined, images: undefined }
  let heroImageSet = false

  if (existsSync(file)) {
    const db = new Database(file, { readonly: true, fileMustExist: true })
    const tables = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name),
    )
    for (const table of Object.keys(counts)) {
      // A table can be missing when the database is older than the code (it is migrated the next time the app starts).
      if (tables.has(table)) counts[table] = (db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }).total
    }
    if (tables.has('settings')) {
      const row = db.prepare('SELECT hero_image_id AS heroImageId FROM settings WHERE id = 1').get() as
        | { heroImageId: number | null }
        | undefined
      heroImageSet = row?.heroImageId != null
    }
    db.close()
  } else {
    console.log('There is no database here yet. It is created, empty, the first time the app starts.')
  }

  for (const [table, total] of Object.entries(counts)) console.log(`  ${table.padEnd(16)}${total ?? '-'}`)
  console.log(`  ${'hero image'.padEnd(16)}${heroImageSet ? 'set' : 'not set'}`)

  // "images" also counts the hero image (they live in the same table); exclude it here since it is not sample data.
  const productImages = (counts.images ?? 0) - (heroImageSet ? 1 : 0)
  const holdsData = (counts.products ?? 0) > 0 || (counts.guests ?? 0) > 0 || (counts.picks ?? 0) > 0 || productImages > 0
  console.log(holdsData ? '\nThe database holds data (it is NOT clean).' : '\nClean: there is no data at all.')
  if (holdsData && process.argv.includes('--expect-clean')) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
