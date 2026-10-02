import { z } from 'zod'

const schema = z.object({
  mode: z.enum(RECEIVER_MODES).optional(),
  // MIC2 generates the secret; it is pasted here, never typed from memory. `null` forgets it.
  secret: z.string().trim().min(16, 'The signing secret looks too short.').max(256).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  updateReceiverSettings(await readValidatedJson(event, schema))
  return { ok: true }
})
