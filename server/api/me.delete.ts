// The visitor stops being anyone in particular (e.g. on a shared computer).
export default defineEventHandler((event) => {
  forgetGuest(event)
  return { guest: null }
})
