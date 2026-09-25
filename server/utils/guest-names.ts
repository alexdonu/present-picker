import { guestNameSchema, MAX_GUESTS_PER_BATCH } from '#shared/schemas'

/** Names are compared ignoring case ("ana" = "Ana"), also for letters like Ș and Ț. */
export const nameKey = (name: string) => name.toLocaleLowerCase('ro')

/** Turns text with one name per line into a clean list: trimmed, validated, without blanks or repeats. */
export function parseGuestNames(text: string) {
  const seen = new Set<string>()
  const names: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const name = validate(guestNameSchema, line)
    if (seen.has(nameKey(name))) continue
    seen.add(nameKey(name))
    names.push(name)
  }
  if (names.length === 0) throw createError({ statusCode: 400, message: 'Scrie cel puțin un nume.' })
  if (names.length > MAX_GUESTS_PER_BATCH) {
    throw createError({ statusCode: 400, message: `Poți adăuga cel mult ${MAX_GUESTS_PER_BATCH} de invitați odată.` })
  }
  return names
}
