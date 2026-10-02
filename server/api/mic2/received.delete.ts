// Deletes every received event and delivery; the mode and the signing secret stay.
export default defineEventHandler(() => {
  clearReceiverData()
  return { ok: true }
})
