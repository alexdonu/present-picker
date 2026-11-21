import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'

/**
 * A playground unrelated to the party: a proof-of-concept CRM that receives MIC2's Donation webhook
 * (ticket M1C-1989), written from the receiver contract alone, so the webhook can be tested end to end
 * against a deployed server.
 *
 * Its data lives in its own SQLite file (`mic2-webhook.db`), not in the party database: the payloads hold other
 * people's names (donors, volunteers), they must not end up in the party backup, and deleting that one file
 * removes the whole playground. Rows older than RETENTION_DAYS are deleted automatically.
 */

export const RECEIVER_MODES = ['ok', 'error', 'slow', 'redirect'] as const
export type ReceiverMode = (typeof RECEIVER_MODES)[number]

export const RETENTION_DAYS = 30
/** Longer than MIC2's 5-second timeout, so `slow` makes every attempt time out. */
export const SLOW_ANSWER_MS = 8_000
const SIGNATURE_TOLERANCE_SECONDS = 300
export const MAX_BODY_BYTES = 64 * 1024

export type SignatureCheck = 'valid' | 'invalid' | 'stale' | 'malformed' | 'no-secret'

let sqlite: Database.Database | undefined

function useMic2Db() {
  if (sqlite) return sqlite
  const directory = dataDir()
  mkdirSync(directory, { recursive: true })
  sqlite = new Database(join(directory, 'mic2-webhook.db'))
  sqlite.pragma('journal_mode = WAL')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS receiver_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mode TEXT NOT NULL DEFAULT 'ok',
      signing_secret TEXT
    );
    INSERT OR IGNORE INTO receiver_settings (id) VALUES (1);

    -- One row per request that reached the endpoint, signed or not. Metadata only, never the body.
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      received_at TEXT NOT NULL,
      event_type TEXT,
      delivery_id TEXT,
      event_id TEXT,
      signature TEXT NOT NULL,
      clock_skew_seconds INTEGER,
      mode TEXT NOT NULL,
      answer TEXT NOT NULL,
      duplicate INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS deliveries_received_at ON deliveries (received_at);

    -- One row per event, deduplicated on eventId as the contract asks. Only verified requests get here.
    CREATE TABLE IF NOT EXISTS events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      transaction_id TEXT,
      occurred_at TEXT,
      payload TEXT NOT NULL,
      first_received_at TEXT NOT NULL,
      last_received_at TEXT NOT NULL,
      times_received INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS events_first_received_at ON events (first_received_at);
  `)
  return sqlite
}

export function receiverSettings() {
  return useMic2Db().prepare('SELECT mode, signing_secret AS secret FROM receiver_settings WHERE id = 1').get() as {
    mode: ReceiverMode
    secret: string | null
  }
}

export function updateReceiverSettings(changes: { mode?: ReceiverMode, secret?: string | null }) {
  const db = useMic2Db()
  if (changes.mode) db.prepare('UPDATE receiver_settings SET mode = ? WHERE id = 1').run(changes.mode)
  if (changes.secret !== undefined) db.prepare('UPDATE receiver_settings SET signing_secret = ? WHERE id = 1').run(changes.secret)
}

/**
 * `X-MIC2-Signature: t=<unix seconds>,v1=<hex>`, v1 = HMAC-SHA256 of "<t>.<raw body>" with the signing secret.
 * Written from the receiver contract, deliberately not shared with MIC2's own code.
 */
export function checkSignature(rawBody: Buffer, header: string | undefined, secret: string | null, nowMs = Date.now()) {
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header ?? '')
  if (!match) return { result: 'malformed' as SignatureCheck, skew: null }
  const skew = Math.round(nowMs / 1000 - Number(match[1]))
  if (!secret) return { result: 'no-secret' as SignatureCheck, skew }

  const expected = createHmac('sha256', secret).update(`${match[1]}.`).update(rawBody).digest()
  if (!timingSafeEqual(expected, Buffer.from(match[2]!, 'hex'))) return { result: 'invalid' as SignatureCheck, skew }
  if (Math.abs(skew) > SIGNATURE_TOLERANCE_SECONDS) return { result: 'stale' as SignatureCheck, skew }
  return { result: 'valid' as SignatureCheck, skew }
}

/** Stores an event once per eventId. Returns true when this eventId had already been stored. */
export function storeEvent(eventType: string, payload: Record<string, unknown>, rawBody: string, now: string) {
  const db = useMic2Db()
  const eventId = String(payload.eventId)
  const existing = db.prepare('SELECT 1 FROM events WHERE event_id = ?').get(eventId)
  if (existing) {
    db.prepare('UPDATE events SET last_received_at = ?, times_received = times_received + 1 WHERE event_id = ?').run(now, eventId)
    return true
  }
  db.prepare(`INSERT INTO events (event_id, event_type, transaction_id, occurred_at, payload, first_received_at, last_received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    eventId,
    eventType,
    typeof payload.transactionId === 'string' ? payload.transactionId : null,
    typeof payload.occurredAt === 'string' ? payload.occurredAt : null,
    rawBody,
    now,
    now,
  )
  return false
}

export function recordDelivery(row: {
  receivedAt: string
  eventType: string | null
  deliveryId: string | null
  eventId: string | null
  signature: SignatureCheck
  clockSkewSeconds: number | null
  mode: ReceiverMode
  answer: string
  duplicate: boolean
}) {
  useMic2Db().prepare(`INSERT INTO deliveries
    (received_at, event_type, delivery_id, event_id, signature, clock_skew_seconds, mode, answer, duplicate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    row.receivedAt,
    row.eventType,
    row.deliveryId,
    row.eventId,
    row.signature,
    row.clockSkewSeconds,
    row.mode,
    row.answer,
    row.duplicate ? 1 : 0,
  )
}

export function pruneOldRows() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 864e5).toISOString()
  const db = useMic2Db()
  db.prepare('DELETE FROM deliveries WHERE received_at < ?').run(cutoff)
  db.prepare('DELETE FROM events WHERE last_received_at < ?').run(cutoff)
}

export function receiverOverview(limit = 100) {
  pruneOldRows()
  const db = useMic2Db()
  const deliveries = db.prepare(`SELECT id, received_at AS receivedAt, event_type AS eventType, delivery_id AS deliveryId,
      event_id AS eventId, signature, clock_skew_seconds AS clockSkewSeconds, mode, answer, duplicate
    FROM deliveries ORDER BY id DESC LIMIT ?`).all(limit) as Array<Record<string, unknown>>
  const events = db.prepare(`SELECT event_id AS eventId, event_type AS eventType, payload, first_received_at AS firstReceivedAt,
      last_received_at AS lastReceivedAt, times_received AS timesReceived
    FROM events ORDER BY first_received_at DESC LIMIT ?`).all(limit) as Array<Record<string, unknown> & { payload: string }>

  return {
    deliveries: deliveries.map(d => ({ ...d, duplicate: d.duplicate === 1 })),
    events: events.map(e => ({ ...e, payload: JSON.parse(e.payload) as Record<string, unknown> })),
  }
}

/** Charts bucket and label time in the collections' own time zone (iDEAL, "collecte": Dutch), whoever is viewing. */
export const STATS_TIME_ZONE = 'Europe/Amsterdam'
const HOUR_MS = 3_600_000
/** Up to this many hours the timeline shows one bar per hour, beyond it one bar per day. */
const HOURLY_TIMELINE_LIMIT = 72
/** Lower bounds (cents) of the amount ranges. Donations are mostly round sums, so each common sum starts a range. */
const AMOUNT_RANGES = [0, 200, 300, 500, 1000, 2000, 2500, 5000, 10000]
const TOP_VOLUNTEERS = 10

// Fields of a stored payload, as SQL. Business figures count donation.paid only; donation.test is left out.
const PAID = `FROM events WHERE event_type = 'donation.paid'`
const AMOUNT = `json_extract(payload, '$.amount.value')`
const ADMIN_COSTS = `coalesce(json_extract(payload, '$.adminCosts.value'), 0)`
const OCCURRED = `coalesce(occurred_at, first_received_at)`
/** Seconds between the donation and the first delivery that reached us; null without occurredAt. */
const LAG = `(julianday(first_received_at) - julianday(occurred_at)) * 86400`

type Group = { key: string | null, count: number, amount: number }
type HourRow = { hour: string, count: number, amount: number, lagSum: number | null, lagCount: number, lagMax: number | null }

const amsterdamDay = new Intl.DateTimeFormat('en-CA', { timeZone: STATS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/**
 * One bucket per hour (or per Amsterdam day when the data spans more than HOURLY_TIMELINE_LIMIT hours), from the
 * first donation up to now, quiet periods included as zeros. SQL groups by UTC hour; Amsterdam's offset is a whole
 * number of hours, so those hours are also its local hours and only days need regrouping.
 */
function buildTimeline(rows: HourRow[], now: Date) {
  if (!rows.length) return { unit: 'hour' as const, buckets: [] }
  const byHour = new Map(rows.map(r => [Date.parse(r.hour), r]))
  const first = Date.parse(rows[0]!.hour)
  const last = Math.max(Date.parse(rows.at(-1)!.hour), Math.floor(now.getTime() / HOUR_MS) * HOUR_MS)
  const unit = (last - first) / HOUR_MS + 1 <= HOURLY_TIMELINE_LIMIT ? 'hour' as const : 'day' as const

  const buckets = new Map<string, { start: string, count: number, amount: number, lagSum: number, lagCount: number, lagMax: number | null }>()
  for (let t = first; t <= last; t += HOUR_MS) {
    const key = unit === 'hour' ? String(t) : amsterdamDay.format(t)
    let bucket = buckets.get(key)
    if (!bucket) buckets.set(key, (bucket = { start: new Date(t).toISOString(), count: 0, amount: 0, lagSum: 0, lagCount: 0, lagMax: null }))
    const row = byHour.get(t)
    if (!row) continue
    bucket.count += row.count
    bucket.amount += row.amount
    bucket.lagSum += row.lagSum ?? 0
    bucket.lagCount += row.lagCount
    if (row.lagMax !== null) bucket.lagMax = Math.max(bucket.lagMax ?? row.lagMax, row.lagMax)
  }
  return {
    unit,
    buckets: [...buckets.values()].map(({ lagSum, lagCount, ...b }) => ({ ...b, lagAverage: lagCount ? lagSum / lagCount : null })),
  }
}

/** Everything the charts on /admin/mic2 show, added up from the stored events and deliveries (all amounts in cents). */
export function receiverStats(now = new Date()) {
  pruneOldRows()
  const db = useMic2Db()
  const all = <T>(sql: string, ...params: unknown[]) => db.prepare(sql).all(...params) as T[]
  const one = <T>(sql: string, ...params: unknown[]) => db.prepare(sql).get(...params) as T

  const totals = one<{ count: number, gross: number, adminCosts: number, volunteers: number, anonymous: number, campaigns: number, currency: string | null }>(
    `SELECT count(*) AS count, coalesce(sum(${AMOUNT}), 0) AS gross, coalesce(sum(${ADMIN_COSTS}), 0) AS adminCosts,
      count(DISTINCT json_extract(payload, '$.volunteer.id')) AS volunteers,
      coalesce(sum(json_extract(payload, '$.isAnonymous') = 1), 0) AS anonymous,
      count(DISTINCT json_extract(payload, '$.campaign.id')) AS campaigns,
      max(json_extract(payload, '$.amount.currency')) AS currency ${PAID}`)

  // Median: the middle value, or the mean of the two middle values.
  const middle = all<{ v: number }>(`SELECT ${AMOUNT} AS v ${PAID} ORDER BY v LIMIT ? OFFSET ?`,
    totals.count % 2 ? 1 : 2, Math.max(0, Math.floor((totals.count - 1) / 2)))
  const median = middle.length ? middle.reduce((sum, r) => sum + r.v, 0) / middle.length : null

  const lastHour = one<{ count: number, amount: number }>(
    `SELECT count(*) AS count, coalesce(sum(${AMOUNT}), 0) AS amount ${PAID} AND julianday(${OCCURRED}) >= julianday(?)`,
    new Date(now.getTime() - HOUR_MS).toISOString())

  const hours = all<HourRow>(`SELECT strftime('%Y-%m-%dT%H:00:00Z', ${OCCURRED}) AS hour, count(*) AS count,
      sum(${AMOUNT}) AS amount, sum(${LAG}) AS lagSum, count(${LAG}) AS lagCount, max(${LAG}) AS lagMax
    ${PAID} GROUP BY hour ORDER BY hour`)

  const groupBy = (path: string) => all<Group>(`SELECT json_extract(payload, '${path}') AS key, count(*) AS count,
      sum(${AMOUNT}) AS amount ${PAID} GROUP BY key ORDER BY amount DESC`)

  const campaigns = all<{ id: string | null, name: string | null, type: string | null, count: number, amount: number }>(
    `SELECT json_extract(payload, '$.campaign.id') AS id, max(json_extract(payload, '$.campaign.name')) AS name,
      max(json_extract(payload, '$.campaign.type')) AS type, count(*) AS count, sum(${AMOUNT}) AS amount
    ${PAID} GROUP BY id ORDER BY amount DESC`)

  const amountRanges = AMOUNT_RANGES.map((min, i) => ({ min, max: AMOUNT_RANGES[i + 1] ?? null, count: 0, amount: 0 }))
  for (const { v, n } of all<{ v: number, n: number }>(`SELECT ${AMOUNT} AS v, count(*) AS n ${PAID} GROUP BY v`)) {
    const range = amountRanges.findLast(r => v >= r.min) ?? amountRanges[0]!
    range.count += n
    range.amount += v * n
  }

  const volunteers = all<{ name: string | null, count: number, amount: number }>(
    `SELECT max(json_extract(payload, '$.volunteer.name')) AS name, count(*) AS count, sum(${AMOUNT}) AS amount
    ${PAID} AND json_extract(payload, '$.volunteer.id') IS NOT NULL
    GROUP BY json_extract(payload, '$.volunteer.id') ORDER BY amount DESC`)
  const others = volunteers.slice(TOP_VOLUNTEERS)
  const withoutVolunteer = one<{ count: number, amount: number }>(`SELECT count(*) AS count, coalesce(sum(${AMOUNT}), 0) AS amount
    ${PAID} AND json_extract(payload, '$.volunteer.id') IS NULL`)

  // Webhook health covers every delivery and event, test events included: it is about the transport, not the money.
  const lags = one<{ count: number, average: number | null, max: number | null, overMinute: number }>(
    `SELECT count(${LAG}) AS count, avg(${LAG}) AS average, max(${LAG}) AS max, coalesce(sum(${LAG} > 60), 0) AS overMinute FROM events`)
  const p95 = lags.count
    ? one<{ v: number }>(`SELECT ${LAG} AS v FROM events WHERE occurred_at IS NOT NULL ORDER BY v LIMIT 1 OFFSET ?`,
        Math.floor(0.95 * (lags.count - 1))).v
    : null
  const eventCounts = one<{ retried: number, tests: number }>(
    `SELECT coalesce(sum(times_received > 1), 0) AS retried, coalesce(sum(event_type = 'donation.test'), 0) AS tests FROM events`)

  return {
    timeZone: STATS_TIME_ZONE,
    currency: totals.currency ?? 'EUR',
    totals: { ...totals, net: totals.gross - totals.adminCosts, average: totals.count ? totals.gross / totals.count : null, median, lastHour },
    timeline: buildTimeline(hours, now),
    campaigns,
    amountRanges,
    sources: groupBy('$.source'),
    paymentMethods: groupBy('$.paymentMethod'),
    volunteers: {
      top: volunteers.slice(0, TOP_VOLUNTEERS),
      others: { volunteers: others.length, count: others.reduce((s, v) => s + v.count, 0), amount: others.reduce((s, v) => s + v.amount, 0) },
      withoutVolunteer,
    },
    health: {
      deliveries: one<{ total: number, duplicates: number }>(
        'SELECT count(*) AS total, coalesce(sum(duplicate), 0) AS duplicates FROM deliveries'),
      answers: all<{ key: string, count: number }>('SELECT answer AS key, count(*) AS count FROM deliveries GROUP BY key ORDER BY count DESC'),
      signatures: all<{ key: string, count: number }>('SELECT signature AS key, count(*) AS count FROM deliveries GROUP BY key ORDER BY count DESC'),
      ...eventCounts,
      lag: { average: lags.average, p95, max: lags.max, overMinute: lags.overMinute },
    },
  }
}

export function clearReceiverData() {
  const db = useMic2Db()
  db.exec('DELETE FROM deliveries; DELETE FROM events;')
}
