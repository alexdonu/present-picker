// Everything the /admin/mic2 page shows. The signing secret itself is never sent back, only its last 4 characters.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { mode, secret } = receiverSettings()
  return {
    mode,
    secretHint: secret ? secret.slice(-4) : null,
    retentionDays: RETENTION_DAYS,
    ...receiverOverview(),
  }
})
