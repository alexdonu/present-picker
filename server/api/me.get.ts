// Who this browser chose to be (null if nobody yet).
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return { guest: getCurrentGuest(event) ?? null }
})
