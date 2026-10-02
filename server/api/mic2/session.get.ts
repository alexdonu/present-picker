export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return { allowed: await isMic2Viewer(event) }
})
