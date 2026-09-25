import { resolve } from 'node:path'

/** Absolute path of the directory holding the SQLite file and the uploaded images. */
export function dataDir() {
  return resolve(process.cwd(), useRuntimeConfig().dataDir)
}

/** Problems with the private configuration, in a form that can be logged. Empty when all is fine. */
export function configProblems() {
  const { adminPassword, sessionSecret } = useRuntimeConfig()
  const problems: string[] = []
  if (!adminPassword) problems.push('NUXT_ADMIN_PASSWORD is not set')
  if (sessionSecret.length < 32) problems.push('NUXT_SESSION_SECRET must be at least 32 characters long')
  return problems
}

/** Stops admin features from working (instead of silently running insecurely) when the config is incomplete. */
export function assertConfigured() {
  if (configProblems().length) {
    throw createError({
      statusCode: 500,
      message: 'Serverul nu este configurat: lipsesc parola de administrator și/sau cheia secretă.',
    })
  }
}
