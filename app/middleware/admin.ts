// Keeps signed-out visitors out of the admin pages (the admin API enforces this on the server as well).
export default defineNuxtRouteMiddleware(async () => {
  const { admin } = await $fetch<{ admin: boolean }>('/api/admin/session')
  if (!admin) return navigateTo('/admin/login')
})
