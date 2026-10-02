// Keeps signed-out visitors out of the MIC2 playground (its API enforces this on the server as well).
export default defineNuxtRouteMiddleware(async () => {
  const { allowed } = await $fetch<{ allowed: boolean }>('/api/mic2/session')
  if (!allowed) return navigateTo('/admin/mic2/login')
})
