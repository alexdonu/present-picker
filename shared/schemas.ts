import { z } from 'zod'

// All messages below are shown to end users, so they stay in Romanian.

export const MAX_PICK_QUANTITY = 20

/** An http(s) URL. Anything else (javascript:, data:, ...) is rejected. */
const httpUrl = (message: string) =>
  z
    .string()
    .trim()
    .max(2000, 'Adresa este prea lungă.')
    .refine((value) => {
      try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
      } catch {
        return false
      }
    }, message)

/** Empty strings from HTML forms mean "not provided". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional())

export const pickSchema = z.object({
  quantity: z
    .number({ error: 'Alege câte bucăți.' })
    .int('Alege câte bucăți.')
    .min(1, 'Alege cel puțin o bucată.')
    .max(MAX_PICK_QUANTITY, `Poți alege cel mult ${MAX_PICK_QUANTITY} de bucăți odată.`),
  note: optional(z.string().trim().max(200, 'Mențiunea este prea lungă (maxim 200 de caractere).')),
})

export type PickInput = z.infer<typeof pickSchema>

export const productSchema = z.object({
  name: z
    .string({ error: 'Numele produsului este obligatoriu.' })
    .trim()
    .min(1, 'Numele produsului este obligatoriu.')
    .max(120, 'Numele produsului este prea lung (maxim 120 de caractere).'),
  description: optional(z.string().trim().max(1000, 'Descrierea este prea lungă (maxim 1000 de caractere).')),
  link: optional(httpUrl('Linkul produsului trebuie să înceapă cu http:// sau https://')),
  price: optional(
    z
      .string()
      .trim()
      .transform((value) => Number(value.replace(',', '.')))
      .pipe(
        z
          .number({ error: 'Prețul trebuie să fie un număr.' })
          .min(0, 'Prețul nu poate fi negativ.')
          .max(1_000_000, 'Prețul este prea mare.')
          .transform((value) => Math.round(value)),
      ),
  ),
  imageUrl: optional(httpUrl('Adresa imaginii trebuie să înceapă cu http:// sau https://')),
  removeImage: z.preprocess((value) => value === 'true' || value === true, z.boolean()),
})

export type ProductInput = z.infer<typeof productSchema>

/** Who the visitor says they are: the id of someone on the guest list. */
export const identitySchema = z.object({
  guestId: z.number({ error: 'Alege cine ești.' }).int('Alege cine ești.').positive('Alege cine ești.'),
})

export const guestNameSchema = z
  .string({ error: 'Scrie numele invitatului.' })
  .trim()
  .min(1, 'Scrie numele invitatului.')
  .max(60, 'Numele este prea lung (maxim 60 de caractere).')

export const MAX_GUESTS_PER_BATCH = 200
