export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return { admin: await isAdmin(event) }
})
