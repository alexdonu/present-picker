export function formatPrice(lei: number) {
  return `${lei.toLocaleString('ro-RO')} lei`
}

/** "o persoană", "5 persoane", "23 de persoane" (Romanian numbers above 19 take "de"). */
export function formatPeople(count: number) {
  if (count === 1) return 'o persoană'
  const lastTwoDigits = count % 100
  return lastTwoDigits >= 1 && lastTwoDigits <= 19 ? `${count} persoane` : `${count} de persoane`
}

/** Message from a failed API call: the server sends user-facing Romanian text in `data.message`. */
export function errorMessage(error: unknown) {
  const message = (error as { data?: { message?: unknown } } | null)?.data?.message
  return typeof message === 'string' && message ? message : 'A apărut o problemă. Încearcă din nou.'
}

export function isUnauthorized(error: unknown) {
  return (error as { statusCode?: number } | null)?.statusCode === 401
}
