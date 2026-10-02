// Every /api/mic2/* endpoint requires MIC2 playground access (or a party admin session), except these: the webhook
// itself (MIC2 calls it, and it checks its own HMAC signature) and the endpoints that handle signing in.
const OPEN_MIC2_PATHS = new Set(['/api/mic2/webhook', '/api/mic2/login', '/api/mic2/logout', '/api/mic2/session'])

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)
  if (!pathname.startsWith('/api/mic2/') || OPEN_MIC2_PATHS.has(pathname)) return
  await requireMic2Viewer(event)
})
