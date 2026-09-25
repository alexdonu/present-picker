// Every /api/admin/* endpoint requires an admin session, except these (they handle their own auth state).
// Doing it here means a new admin endpoint can never be forgotten unprotected.
const OPEN_ADMIN_PATHS = new Set(['/api/admin/login', '/api/admin/logout', '/api/admin/session'])

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)
  if (!pathname.startsWith('/api/admin/') || OPEN_ADMIN_PATHS.has(pathname)) return
  await requireAdmin(event)
})
