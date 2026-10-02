// The MIC2 Donation webhook receiver (playground, see server/utils/mic2-webhook.ts). Give MIC2 this exact URL,
// https://<host>/api/mic2/webhook: MIC2 never follows redirects, so it must be the final address.
//
// It answers according to the mode chosen on /admin/mic2:
//   ok        200 (stores the event once per eventId)
//   error     500, nothing stored: MIC2 retries
//   slow      stores the event, then answers after 8 s: MIC2 times out and retries, and the retry shows as a duplicate
//   redirect  302, nothing stored: MIC2 counts it as a failure and does not follow it
// A request whose signature does not verify always gets 401 and is logged without its body.
export default defineEventHandler(async (event) => {
  const receivedAt = new Date().toISOString()
  const rawBody = (await readRawBody(event, false)) ?? Buffer.alloc(0)
  if (rawBody.length > MAX_BODY_BYTES) {
    setResponseStatus(event, 413)
    return 'Body too large'
  }

  const header = (name: string) => getRequestHeader(event, name) ?? null
  const eventType = header('x-mic2-event')
  const deliveryId = header('x-mic2-delivery-id')
  const { mode, secret } = receiverSettings()
  const signature = checkSignature(rawBody, header('x-mic2-signature') ?? undefined, secret)

  const log = (answer: string, extra: { eventId?: string | null, duplicate?: boolean } = {}) =>
    recordDelivery({
      receivedAt,
      eventType,
      deliveryId,
      eventId: extra.eventId ?? null,
      signature: signature.result,
      clockSkewSeconds: signature.skew,
      mode,
      answer,
      duplicate: extra.duplicate ?? false,
    })

  if (signature.result !== 'valid') {
    log('401')
    setResponseStatus(event, 401)
    return 'Signature did not verify'
  }

  // Parsed only now, after the signature was checked over the raw bytes.
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  }
  catch {
    log('400')
    setResponseStatus(event, 400)
    return 'Body is not JSON'
  }
  const eventId = typeof payload.eventId === 'string' ? payload.eventId : null

  if (mode === 'error') {
    log('500', { eventId })
    setResponseStatus(event, 500)
    return 'Receiver set to fail'
  }
  if (mode === 'redirect') {
    log('302', { eventId })
    return sendRedirect(event, '/', 302)
  }

  // Unknown event types are acknowledged and not stored, as the contract recommends.
  const known = eventType === 'donation.paid' || eventType === 'donation.test'
  const duplicate = known && eventId ? storeEvent(eventType!, payload, rawBody.toString('utf8'), receivedAt) : false

  if (mode === 'slow') {
    log(`200 după ${SLOW_ANSWER_MS / 1000} s`, { eventId, duplicate })
    await new Promise(resolve => setTimeout(resolve, SLOW_ANSWER_MS))
  }
  else {
    log('200', { eventId, duplicate })
  }
  return duplicate ? 'ok (duplicate)' : 'ok'
})
