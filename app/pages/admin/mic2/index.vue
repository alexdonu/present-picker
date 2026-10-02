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

const { data, refresh } = await useFetch<Overview>('/api/mic2/overview')

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

    <div class="mt-10 grid gap-6 lg:grid-cols-2">
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
              </td>
              <td class="py-2 pr-4">
                {{ donorLabel(item.payload) }}
                <span v-if="item.payload.wantsMonthly" class="block text-ink-soft">wants monthly</span>
              </td>
              <td class="py-2 pr-4">
                {{ item.payload.volunteer ? item.payload.volunteer.name ?? 'no name' : '—' }}
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
