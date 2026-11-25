<script setup lang="ts">
// Playground unrelated to the party: the proof-of-concept CRM for MIC2's Donation webhook
// (see server/utils/mic2-webhook.ts).
definePageMeta({ layout: 'mic2', middleware: 'mic2' })
useHead({ title: 'MIC2 webhook' })

type Mode = 'ok' | 'error' | 'slow' | 'redirect'
type Money = { value: number; currency: string }
type Payload = {
  transactionId?: string
  occurredAt?: string
  amount?: Money
  adminCosts?: Money
  paymentMethod?: string
  wantsMonthly?: boolean
  campaign?: { name?: string; type?: string }
  personalCampaign?: { title?: string } | null
  volunteer?: { name?: string | null } | null
  donor?: { name?: string }
  isAnonymous?: boolean
  // Set when MIC2 moved the donation to another campaign after it was sent.
  transfer?: { at?: string; note?: string; fromCampaign?: { name?: string } | null; fromVolunteer?: { name?: string | null } | null }
}
type Overview = {
  mode: Mode
  secretHint: string | null
  retentionDays: number
  deliveries: {
    id: number
    receivedAt: string
    eventType: string | null
    deliveryId: string | null
    eventId: string | null
    signature: string
    clockSkewSeconds: number | null
    mode: Mode
    answer: string
    duplicate: boolean
  }[]
  events: {
    eventId: string
    eventType: string
    payload: Payload
    firstReceivedAt: string
    timesReceived: number
  }[]
}

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'ok', label: 'OK', hint: 'answer 200 and store the event' },
  { value: 'error', label: 'Error', hint: 'answer 500, nothing stored: MIC2 retries' },
  { value: 'slow', label: 'Slow', hint: 'store, then answer after 8 s: MIC2 times out and retries' },
  { value: 'redirect', label: 'Redirect', hint: 'answer 302: MIC2 does not follow it and counts a failure' },
]

const SIGNATURE_LABELS: Record<string, string> = {
  valid: 'valid',
  invalid: 'does NOT match',
  stale: 'too old (> 5 min)',
  malformed: 'missing or malformed',
  'no-secret': 'no secret saved',
}

const { data, refresh: refreshOverview } = await useFetch<Overview>('/api/mic2/overview')
const { data: stats, refresh: refreshStats } = await useFetch('/api/mic2/stats')
const refresh = () => Promise.all([refreshOverview(), refreshStats()])

const webhookUrl = ref('')
onMounted(() => (webhookUrl.value = `${window.location.origin}/api/mic2/webhook`))

// The page is a live log: refresh every 5 seconds while it is open.
const timer = ref<ReturnType<typeof setInterval>>()
onMounted(() => (timer.value = setInterval(() => refresh(), 5_000)))
onBeforeUnmount(() => clearInterval(timer.value))

const secret = ref('')
const error = ref('')
const busy = ref(false)

async function run(action: () => Promise<unknown>) {
  error.value = ''
  busy.value = true
  try {
    await action()
    await refresh()
    return true
  } catch (e) {
    if (isUnauthorized(e)) await navigateTo('/admin/mic2/login')
    // Not errorMessage(): its fallback is Romanian, and this page is in English.
    else error.value = (e as { data?: { message?: string } })?.data?.message || 'Something went wrong. Try again.'
    return false
  } finally {
    busy.value = false
  }
}

const saveSettings = (body: { mode?: Mode; secret?: string | null }) =>
  run(() => $fetch('/api/mic2/settings', { method: 'PUT', body }))

async function saveSecret() {
  if (await saveSettings({ secret: secret.value })) secret.value = ''
}

async function forgetSecret() {
  if (!window.confirm('Delete the signing secret? Every delivery will get 401 until you save another one.')) return
  await saveSettings({ secret: null })
}

async function clearAll() {
  if (!window.confirm('Delete every received event and delivery?')) return
  await run(() => $fetch('/api/mic2/received', { method: 'DELETE' }))
}

const euro = (money?: Money) =>
  money ? (money.value / 100).toLocaleString('en-GB', { style: 'currency', currency: money.currency || 'EUR' }) : '—'
const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }) : '—'

function donorLabel(payload: Payload) {
  if (payload.donor?.name) return payload.donor.name
  return payload.isAnonymous ? 'anonymous (chose to be)' : 'no name (not asked)'
}

// --- Charts (from /api/mic2/stats; amounts in cents, times in the collections' time zone) ---

const SOURCE_LABELS: Record<string, string> = {
  mobile: 'Mobile link',
  qr_can: 'QR code on a collection can',
  qr_board: 'QR code on a board',
}
const METHOD_LABELS: Record<string, string> = {
  ideal: 'iDEAL',
  mastercard: 'Mastercard',
  visa: 'Visa',
  bancontact: 'Bancontact',
  paypal: 'PayPal',
  applepay: 'Apple Pay',
}

const cents = (value: number | null | undefined) =>
  value == null ? '—' : (value / 100).toLocaleString('en-GB', { style: 'currency', currency: stats.value?.currency ?? 'EUR' })
const shortEuro = (value: number) => `€${value % 100 ? (value / 100).toFixed(2) : value / 100}`
const count = (value: number) => value.toLocaleString('en-GB')
function percent(part: number, whole: number) {
  if (!whole) return '—'
  const value = (part / whole) * 100
  return part && value < 1 ? '<1%' : `${Math.round(value)}%`
}

function seconds(value: number | null | undefined) {
  if (value == null) return '—'
  if (Math.abs(value) < 60) return `${value.toFixed(1)} s`
  const minutes = Math.floor(value / 60)
  if (minutes < 60) return `${minutes} min ${Math.round(value % 60)} s`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

const zoned = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: stats.value?.timeZone, ...options })

/** Axis and tooltip formats for the timeline's buckets, hourly or daily. */
const bucketFormats = computed(() => {
  const hourly = stats.value?.timeline.unit !== 'day'
  return {
    hourly,
    axis: zoned(hourly ? { weekday: 'short', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }),
    title: zoned(hourly
      ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { weekday: 'short', day: 'numeric', month: 'short' }),
  }
})

const timelinePoints = computed(() => {
  let running = 0
  return (stats.value?.timeline.buckets ?? []).map((bucket) => {
    running += bucket.amount
    const start = new Date(bucket.start)
    return {
      key: bucket.start,
      axis: bucketFormats.value.axis.format(start),
      title: `${bucketFormats.value.title.format(start)}: ${count(bucket.count)} donations, ${cents(bucket.amount)} (total so far ${cents(running)})`,
      value: bucket.count,
      line: running,
    }
  })
})

const lagPoints = computed(() =>
  (stats.value?.timeline.buckets ?? []).map((bucket) => {
    const start = new Date(bucket.start)
    return {
      key: bucket.start,
      axis: bucketFormats.value.axis.format(start),
      title: bucket.lagMax === null
        ? `${bucketFormats.value.title.format(start)}: no donations`
        : `${bucketFormats.value.title.format(start)}: slowest ${seconds(bucket.lagMax)}, average ${seconds(bucket.lagAverage)}`,
      value: Math.max(0, bucket.lagMax ?? 0),
    }
  }))

const overviewTiles = computed(() => {
  const t = stats.value?.totals
  if (!t) return []
  return [
    { label: 'Raised', value: cents(t.gross), note: `${count(t.count)} donations` },
    { label: 'Net after admin costs', value: cents(t.net), note: `${cents(t.adminCosts)} admin costs` },
    { label: 'Average gift', value: cents(t.average), note: `median ${cents(t.median)}` },
    { label: 'Last hour', value: cents(t.lastHour.amount), note: `${count(t.lastHour.count)} donations` },
    { label: 'Volunteers', value: count(t.volunteers), note: `${count(t.campaigns)} campaign${t.campaigns === 1 ? '' : 's'}` },
    { label: 'Anonymous', value: percent(t.anonymous, t.count), note: `${count(t.anonymous)} donors chose it` },
  ]
})

const campaignRows = computed(() =>
  (stats.value?.campaigns ?? []).map(c => ({
    key: c.id ?? 'none',
    label: c.name ?? 'no campaign',
    hint: c.type ?? undefined,
    value: c.amount,
    display: cents(c.amount),
    note: `${count(c.count)} donations`,
    sub: [
      c.transferredInCount ? `Includes ${count(c.transferredInCount)} transferred in (${cents(c.transferredInAmount)}).` : '',
      c.transferredOutCount
        ? `${count(c.transferredOutCount)} transferred to ${c.transferredOutTo ?? 'another campaign'} (${cents(c.transferredOutAmount)}).`
        : '',
    ].filter(Boolean).join(' ') || undefined,
  })))

const amountRows = computed(() => {
  const total = stats.value?.totals.count ?? 0
  return (stats.value?.amountRanges ?? []).map(r => ({
    key: String(r.min),
    label: r.max === null ? `${shortEuro(r.min)} or more` : r.min === 0 ? `under ${shortEuro(r.max)}` : `${shortEuro(r.min)} – ${shortEuro(r.max - 1)}`,
    value: r.count,
    display: count(r.count),
    note: `${percent(r.count, total)} · ${cents(r.amount)}`,
  }))
})

function shareRows(groups: { key: string | null; count: number; amount: number }[], labels: Record<string, string>) {
  const total = groups.reduce((sum, g) => sum + g.count, 0)
  return [...groups]
    .sort((a, b) => b.count - a.count)
    .map(g => ({
      key: g.key ?? 'none',
      label: g.key === null ? 'not sent' : labels[g.key] ?? g.key,
      hint: g.key !== null && labels[g.key] ? g.key : undefined,
      value: g.count,
      display: percent(g.count, total),
      note: `${count(g.count)} · ${cents(g.amount)}`,
    }))
}
const sourceRows = computed(() => shareRows(stats.value?.sources ?? [], SOURCE_LABELS))
const methodRows = computed(() => shareRows(stats.value?.paymentMethods ?? [], METHOD_LABELS))

const volunteerRows = computed(() =>
  (stats.value?.volunteers.top ?? []).map((v, i) => ({
    key: String(i),
    label: `${i + 1}. ${v.name ?? 'no name'}`,
    value: v.amount,
    display: cents(v.amount),
    note: `${count(v.count)} donations`,
  })))

const healthTiles = computed(() => {
  const h = stats.value?.health
  if (!h) return []
  const accepted = h.answers.filter(a => a.key.startsWith('200')).reduce((sum, a) => sum + a.count, 0)
  const rejected = h.signatures.filter(s => s.key !== 'valid').reduce((sum, s) => sum + s.count, 0)
  return [
    { label: 'Deliveries', value: count(h.deliveries.total), note: `${percent(accepted, h.deliveries.total)} answered 200` },
    { label: 'Signature rejected', value: count(rejected), note: rejected ? 'see the deliveries table' : 'every one verified' },
    { label: 'Duplicates', value: count(h.deliveries.duplicates), note: `${count(h.retried)} donations arrived more than once` },
    { label: 'Average delay', value: seconds(h.lag.average), note: `95% within ${seconds(h.lag.p95)}` },
    { label: 'Slowest delivery', value: seconds(h.lag.max), note: `${count(h.lag.overMinute)} took over a minute` },
    { label: 'Test events', value: count(h.tests), note: 'left out of the money figures' },
  ]
})

const answerRows = computed(() =>
  (stats.value?.health.answers ?? []).map(a => ({ key: a.key, label: a.key, value: a.count, display: count(a.count) })))
const signatureRows = computed(() =>
  (stats.value?.health.signatures ?? []).map(s => ({
    key: s.key,
    label: SIGNATURE_LABELS[s.key] ?? s.key,
    value: s.count,
    display: count(s.count),
  })))
</script>

<template>
  <div>
    <p class="eyebrow">Test receiver · M1C-1989</p>
    <h1 class="mt-2 text-6xl leading-none">MIC2 webhook</h1>
    <p class="mt-3 max-w-2xl text-ink-muted">
      A proof-of-concept CRM that receives the MIC2 Donation webhook (M1C-1989). Its data is kept in a separate
      database and deleted automatically after {{ data?.retentionDays }} days.
    </p>

    <p v-if="error" class="notice-error mt-6" role="alert">{{ error }}</p>

    <section class="mt-10">
      <h2 class="text-4xl">At a glance</h2>
      <p class="mt-1 text-sm text-ink-soft">
        Paid donations from the last {{ data?.retentionDays }} days (test events left out). Times are Amsterdam time.
      </p>
      <Mic2Tiles class="mt-4" :tiles="overviewTiles" />
    </section>

    <section class="panel mt-6 p-5 sm:p-8">
      <h2 class="text-3xl">Over time</h2>
      <p class="mb-5 mt-1 text-sm text-ink-soft">Hover a column for its numbers.</p>
      <Mic2TimeChart
        :points="timelinePoints"
        :bar-legend="`Donations per ${bucketFormats.hourly ? 'hour' : 'day'}`"
        :line-legend="`Amount raised so far (${cents(stats?.totals.gross)})`"
        empty="No paid donations yet."
      />
    </section>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <section class="panel p-5 sm:p-8">
        <h2 class="text-3xl">Campaigns</h2>
        <p class="mb-5 mt-1 text-sm text-ink-soft">Amount raised per campaign.</p>
        <Mic2Bars :rows="campaignRows" empty="No paid donations yet." />
      </section>
      <section class="panel p-5 sm:p-8">
        <h2 class="text-3xl">Gift sizes</h2>
        <p class="mb-5 mt-1 text-sm text-ink-soft">How many donations fall in each range.</p>
        <Mic2Bars :rows="amountRows" tone="mustard" empty="No paid donations yet." />
      </section>
      <section class="panel p-5 sm:p-8">
        <h2 class="text-3xl">Where donors came from</h2>
        <p class="mb-5 mt-1 text-sm text-ink-soft">The <code class="font-mono text-xs">source</code> of each donation.</p>
        <Mic2Bars :rows="sourceRows" empty="No paid donations yet." />
      </section>
      <section class="panel p-5 sm:p-8">
        <h2 class="text-3xl">How they paid</h2>
        <p class="mb-5 mt-1 text-sm text-ink-soft">The <code class="font-mono text-xs">paymentMethod</code> of each donation.</p>
        <Mic2Bars :rows="methodRows" tone="burgundy" empty="No paid donations yet." />
      </section>
    </div>

    <section class="panel mt-6 p-5 sm:p-8">
      <h2 class="text-3xl">Top volunteers</h2>
      <p class="mb-5 mt-1 text-sm text-ink-soft">By amount raised.</p>
      <Mic2Bars :rows="volunteerRows" empty="No donations with a volunteer yet." />
      <p v-if="stats?.volunteers.others.volunteers" class="mt-4 text-sm text-ink-muted">
        {{ count(stats.volunteers.others.volunteers) }} other volunteers raised {{ cents(stats.volunteers.others.amount) }}
        in {{ count(stats.volunteers.others.count) }} donations.
      </p>
      <p v-if="stats?.volunteers.withoutVolunteer.count" class="mt-1 text-sm text-ink-muted">
        {{ count(stats.volunteers.withoutVolunteer.count) }} donations ({{ cents(stats.volunteers.withoutVolunteer.amount) }})
        came without a volunteer.
      </p>
    </section>

    <section class="mt-12">
      <h2 class="text-4xl">Webhook health</h2>
      <p class="mt-1 text-sm text-ink-soft">
        Every delivery, test events included. Delay is from the donation's <code class="font-mono text-xs">occurredAt</code>
        to the first delivery that reached this receiver.
      </p>
      <Mic2Tiles class="mt-4" :tiles="healthTiles" />
    </section>

    <section class="panel mt-6 p-5 sm:p-8">
      <h2 class="text-3xl">Delivery delay</h2>
      <p class="mb-5 mt-1 text-sm text-ink-soft">The slowest delivery in each {{ bucketFormats.hourly ? 'hour' : 'day' }}; hover for the average.</p>
      <Mic2TimeChart
        :points="lagPoints"
        tone="burgundy"
        :bar-legend="`Slowest delivery per ${bucketFormats.hourly ? 'hour' : 'day'} (highest ${seconds(stats?.health.lag.max)})`"
        empty="No deliveries yet."
      />
    </section>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <section class="panel p-5 sm:p-8">
        <h2 class="text-3xl">Answers sent</h2>
        <p class="mb-5 mt-1 text-sm text-ink-soft">What this receiver answered, per delivery.</p>
        <Mic2Bars :rows="answerRows" empty="No deliveries yet." />
      </section>
      <section class="panel p-5 sm:p-8">
        <h2 class="text-3xl">Signatures</h2>
        <p class="mb-5 mt-1 text-sm text-ink-soft">The HMAC check on each delivery.</p>
        <Mic2Bars :rows="signatureRows" tone="burgundy" empty="No deliveries yet." />
      </section>
    </div>

    <h2 class="mt-16 text-4xl">Receiver</h2>
    <div class="mt-4 grid gap-6 lg:grid-cols-2">
      <section class="panel space-y-4 p-5 sm:p-8">
        <h2 class="text-3xl">Setup</h2>
        <div>
          <p class="field-label">Webhook URL (enter it in MIC2 exactly like this)</p>
          <code class="block break-all font-mono text-sm">{{ webhookUrl }}</code>
        </div>
        <div>
          <label for="mic2-secret" class="field-label">Signing secret (from MIC2 → Integrations)</label>
          <p class="mb-2 text-sm text-ink-soft">
            {{ data?.secretHint ? `Saved, ends in …${data.secretHint}.` : 'No secret saved: every delivery gets 401.' }}
          </p>
          <form class="flex flex-wrap gap-3" @submit.prevent="saveSecret">
            <input id="mic2-secret" v-model="secret" class="field flex-1" type="password" autocomplete="off" />
            <button type="submit" class="btn btn-primary" :disabled="busy || !secret">Save</button>
            <button v-if="data?.secretHint" type="button" class="btn btn-danger" :disabled="busy" @click="forgetSecret">
              Delete
            </button>
          </form>
        </div>
      </section>

      <section class="panel space-y-4 p-5 sm:p-8">
        <h2 class="text-3xl">How it answers</h2>
        <fieldset class="space-y-2">
          <legend class="sr-only">Answer mode</legend>
          <label v-for="option in MODES" :key="option.value" class="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="mode"
              class="mt-1"
              :value="option.value"
              :checked="data?.mode === option.value"
              :disabled="busy"
              @change="saveSettings({ mode: option.value })"
            />
            <span><strong>{{ option.label }}</strong> — {{ option.hint }}</span>
          </label>
        </fieldset>
        <div class="flex flex-wrap gap-3 pt-2">
          <button type="button" class="btn" :disabled="busy" @click="refresh()">Refresh</button>
          <button type="button" class="btn btn-danger" :disabled="busy" @click="clearAll">Delete everything received</button>
        </div>
      </section>
    </div>

    <section class="mt-12">
      <h2 class="text-4xl">Received donations</h2>
      <p class="mt-1 text-sm text-ink-soft">One per eventId; “received N times” shows retries and resends.</p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[48rem] text-left text-sm">
          <thead class="mono-label border-b border-ink">
            <tr>
              <th class="py-2 pr-4">Received</th>
              <th class="py-2 pr-4">Amount</th>
              <th class="py-2 pr-4">Campaign</th>
              <th class="py-2 pr-4">Donor</th>
              <th class="py-2 pr-4">Volunteer</th>
              <th class="py-2 pr-4">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data?.events" :key="item.eventId" class="border-b border-ink/15 align-top">
              <td class="py-2 pr-4">
                {{ time(item.firstReceivedAt) }}
                <span v-if="item.eventType === 'donation.test'" class="mono-label ml-1 text-burgundy">test</span>
                <span v-if="item.timesReceived > 1" class="block text-ink-soft">received {{ item.timesReceived }} times</span>
              </td>
              <td class="py-2 pr-4">
                {{ euro(item.payload.amount) }}
                <span class="block text-ink-soft">of which admin costs {{ euro(item.payload.adminCosts) }}</span>
              </td>
              <td class="py-2 pr-4">
                {{ item.payload.campaign?.name }} <span class="text-ink-soft">({{ item.payload.campaign?.type }})</span>
                <span v-if="item.payload.personalCampaign" class="block text-ink-soft">{{ item.payload.personalCampaign.title }}</span>
                <span v-if="item.payload.transfer" class="mono-label block text-burgundy" :title="item.payload.transfer.note">
                  transferred from {{ item.payload.transfer.fromCampaign?.name ?? 'another campaign' }}
                </span>
              </td>
              <td class="py-2 pr-4">
                {{ donorLabel(item.payload) }}
                <span v-if="item.payload.wantsMonthly" class="block text-ink-soft">wants monthly</span>
              </td>
              <td class="py-2 pr-4">
                {{ item.payload.volunteer ? item.payload.volunteer.name ?? 'no name' : '—' }}
                <span v-if="item.payload.transfer?.fromVolunteer" class="block text-ink-soft">
                  was {{ item.payload.transfer.fromVolunteer.name ?? 'a QR board' }}
                </span>
              </td>
              <td class="py-2 pr-4">
                <details>
                  <summary class="cursor-pointer">JSON</summary>
                  <pre class="mt-2 max-w-md overflow-x-auto text-xs">{{ JSON.stringify(item.payload, null, 2) }}</pre>
                </details>
              </td>
            </tr>
            <tr v-if="!data?.events.length">
              <td colspan="6" class="py-4 text-ink-soft">Nothing received yet. Send a test event from MIC2.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mt-12">
      <h2 class="text-4xl">Deliveries</h2>
      <p class="mt-1 text-sm text-ink-soft">Every request that reached the endpoint, rejected ones included. Bodies are not kept.</p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[48rem] text-left text-sm">
          <thead class="mono-label border-b border-ink">
            <tr>
              <th class="py-2 pr-4">Received</th>
              <th class="py-2 pr-4">Event</th>
              <th class="py-2 pr-4">Signature</th>
              <th class="py-2 pr-4">Clock skew</th>
              <th class="py-2 pr-4">Answer</th>
              <th class="py-2 pr-4">Delivery id / eventId</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data?.deliveries" :key="item.id" class="border-b border-ink/15 align-top">
              <td class="py-2 pr-4">{{ time(item.receivedAt) }}</td>
              <td class="py-2 pr-4">{{ item.eventType ?? '—' }}</td>
              <td class="py-2 pr-4" :class="item.signature === 'valid' ? '' : 'font-bold text-burgundy'">
                {{ SIGNATURE_LABELS[item.signature] ?? item.signature }}
              </td>
              <td class="py-2 pr-4">{{ item.clockSkewSeconds === null ? '—' : `${item.clockSkewSeconds} s` }}</td>
              <td class="py-2 pr-4">
                {{ item.answer }}
                <span v-if="item.duplicate" class="block text-ink-soft">duplicate</span>
              </td>
              <td class="py-2 pr-4 font-mono text-xs">
                <span class="block">{{ item.deliveryId ?? '—' }}</span>
                <span class="block text-ink-soft">{{ item.eventId ?? '—' }}</span>
              </td>
            </tr>
            <tr v-if="!data?.deliveries.length">
              <td colspan="6" class="py-4 text-ink-soft">No deliveries yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
