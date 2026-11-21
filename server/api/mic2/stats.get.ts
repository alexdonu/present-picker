// The charts on the /admin/mic2 page (protected by server/middleware/mic2-auth.ts). Totals only, apart from the
// top volunteers' names, which the page's donation table already shows.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return receiverStats()
})
