import { guests, picks, products } from '../db/schema'

// Container health probe. Checks the database, not just the process: a server that is up but cannot read its
// database serves only errors. Public, and deliberately says nothing about what failed (that goes to the log).
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const db = useDb()
    // Opens (and migrates) the database on first use; quick_check catches a damaged file.
    const integrity = db.$client.pragma('quick_check', { simple: true })
    if (integrity !== 'ok') throw new Error(`quick_check: ${integrity}`)
    // A read from every table proves the migrations were applied, not just that a file exists.
    for (const table of [products, guests, picks]) db.select().from(table).limit(1).all()
    return { status: 'ok' }
  }
  catch (error) {
    console.error('[present-picker] Health check failed:', error)
    setResponseStatus(event, 503)
    return { status: 'error' }
  }
})
