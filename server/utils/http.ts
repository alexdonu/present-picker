import type { H3Event } from 'h3'
import type { z } from 'zod'

/** Validates data against a schema; the first problem becomes a 400 whose message is safe to show users. */
export function validate<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw createError({ statusCode: 400, message: result.error.issues[0]?.message ?? 'Date invalide.' })
  }
  return result.data
}

export async function readValidatedJson<T extends z.ZodType>(event: H3Event, schema: T) {
  return validate(schema, await readBody(event))
}

export function getIdParam(event: H3Event) {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id < 1) {
    throw createError({ statusCode: 404, message: 'Nu am găsit ce cauți.' })
  }
  return id
}
