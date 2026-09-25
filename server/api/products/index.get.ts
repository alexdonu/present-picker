export default defineEventHandler((event) => {
  // Personalised (flags the visitor's own picks), so it must never be cached by a browser or proxy.
  setHeader(event, 'Cache-Control', 'no-store')
  return loadProducts(getCurrentGuest(event)?.id)
})
