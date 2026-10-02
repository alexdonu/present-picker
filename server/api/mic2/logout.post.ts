// Ends the MIC2 playground session only; a party admin session stays.
export default defineEventHandler(async (event) => {
  const session = await useMic2Session(event)
  await session.clear()
  return { ok: true }
})
