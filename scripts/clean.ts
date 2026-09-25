/**
 * Empties the database: deletes ALL products, guests, picks and uploaded product images (the tables stay).
 *
 *   npm run db:clean             shows what would be deleted and asks you to type "delete"
 *   npm run db:clean -- --yes    skips the question (for scripts)
 *
 * It uses the same database as the app: `./data`, or `NUXT_DATA_DIR` (also read from `.env`).
 * This cannot be undone. Do not run it on the database holding the real party data.
 */
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { openDatabase } from '../server/db/connect'
import { countData, databaseFile, dataDirectory, wipeData } from './lib/data'

async function main() {
  const directory = dataDirectory()
  const file = databaseFile(directory)
  console.log(`Database: ${file}`)

  // Opening the database would create it, so look first: cleaning a database that does not exist is a no-op.
  if (!existsSync(file)) {
    console.log('There is no database here yet, nothing to clean.')
    return
  }

  const db = openDatabase(directory)
  const counts = await countData(db, directory)
  if (counts.products === 0 && counts.guests === 0 && counts.picks === 0 && counts.images === 0) {
    console.log('Already clean, nothing to delete.')
    return
  }

  console.log(
    `This will permanently delete ${counts.products} product(s), ${counts.guests} guest(s), ${counts.picks} pick(s) and ${counts.images} uploaded image(s).`,
  )

  if (!process.argv.includes('--yes')) {
    if (!process.stdin.isTTY) {
      console.error('Not running in an interactive terminal, so there is nobody to ask. Nothing was changed; pass --yes to confirm.')
      process.exitCode = 1
      return
    }
    const terminal = createInterface({ input: process.stdin, output: process.stdout })
    // Closing the input (Ctrl+D) makes `question` reject; that is just another way of saying "no".
    const answer = await terminal.question('Type "delete" to continue: ').catch(() => '')
    terminal.close()
    if (answer.trim().toLowerCase() !== 'delete') {
      console.log('Cancelled, nothing was changed.')
      return
    }
  }

  await wipeData(db, directory)
  console.log('Done. The database is empty.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
