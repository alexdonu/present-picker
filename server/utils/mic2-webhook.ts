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

export function clearReceiverData() {
  const db = useMic2Db()
  db.exec('DELETE FROM deliveries; DELETE FROM events;')
}
