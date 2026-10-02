<script setup lang="ts">
// Playground unrelated to the party: the proof-of-concept CRM for MIC2's Donation webhook
// (see server/utils/mic2-webhook.ts).
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Webhook MIC2 · Present Picker' })

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
  { value: 'ok', label: 'OK', hint: 'răspunde 200 și salvează evenimentul' },
  { value: 'error', label: 'Eroare', hint: 'răspunde 500, MIC2 reîncearcă' },
  { value: 'slow', label: 'Lent', hint: 'răspunde după 8 s, MIC2 consideră timeout și reîncearcă' },
  { value: 'redirect', label: 'Redirect', hint: 'răspunde 302, MIC2 nu îl urmează: eșec' },
]

const SIGNATURE_LABELS: Record<string, string> = {
  valid: 'validă',
  invalid: 'NU se potrivește',
  stale: 'prea veche (> 5 min)',
  malformed: 'lipsă sau greșită',
  'no-secret': 'fără cheie salvată',
}

const { data, refresh } = await useFetch<Overview>('/api/admin/mic2')

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
    if (isUnauthorized(e)) await navigateTo('/admin/login')
    else error.value = errorMessage(e)
    return false
  } finally {
    busy.value = false
  }
}

const saveSettings = (body: { mode?: Mode; secret?: string | null }) =>
  run(() => $fetch('/api/admin/mic2/settings', { method: 'PUT', body }))

async function saveSecret() {
  if (await saveSettings({ secret: secret.value })) secret.value = ''
}

async function forgetSecret() {
  if (!window.confirm('Ștergi cheia de semnare? Toate livrările vor primi 401 până salvezi alta.')) return
  await saveSettings({ secret: null })
}

async function clearAll() {
  if (!window.confirm('Ștergi toate evenimentele și livrările primite?')) return
  await run(() => $fetch('/api/admin/mic2', { method: 'DELETE' }))
}

const euro = (money?: Money) =>
  money ? (money.value / 100).toLocaleString('ro-RO', { style: 'currency', currency: money.currency || 'EUR' }) : '—'
const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'medium' }) : '—'

function donorLabel(payload: Payload) {
  if (payload.donor?.name) return payload.donor.name
  return payload.isAnonymous ? 'anonim (a ales)' : 'fără nume (nu s-a cerut)'
}
</script>

<template>
  <div>
    <p class="eyebrow">Teren de joacă · fără legătură cu petrecerea</p>
    <h1 class="mt-2 text-6xl leading-none">Webhook MIC2</h1>
    <p class="mt-3 max-w-2xl text-ink-muted">
      Un CRM de probă care primește webhook-ul de donații din MIC2 (M1C-1989). Datele stau într-o bază separată și
      se șterg singure după {{ data?.retentionDays }} de zile.
    </p>

    <p v-if="error" class="notice-error mt-6" role="alert">{{ error }}</p>

    <div class="mt-10 grid gap-6 lg:grid-cols-2">
      <section class="panel space-y-4 p-5 sm:p-8">
        <h2 class="text-3xl">Configurare</h2>
        <div>
          <p class="field-label">Adresa webhook-ului (de pus în MIC2, exact așa)</p>
          <code class="block break-all font-mono text-sm">{{ webhookUrl }}</code>
        </div>
        <div>
          <label for="mic2-secret" class="field-label">Cheia de semnare (din MIC2 → Integrations)</label>
          <p class="mb-2 text-sm text-ink-soft">
            {{ data?.secretHint ? `Salvată, se termină în …${data.secretHint}.` : 'Nicio cheie salvată: orice livrare primește 401.' }}
          </p>
          <form class="flex flex-wrap gap-3" @submit.prevent="saveSecret">
            <input id="mic2-secret" v-model="secret" class="field flex-1" type="password" autocomplete="off" />
            <button type="submit" class="btn btn-primary" :disabled="busy || !secret">Salvează</button>
            <button v-if="data?.secretHint" type="button" class="btn btn-danger" :disabled="busy" @click="forgetSecret">
              Șterge
            </button>
          </form>
        </div>
      </section>

      <section class="panel space-y-4 p-5 sm:p-8">
        <h2 class="text-3xl">Cum răspunde</h2>
        <fieldset class="space-y-2">
          <legend class="sr-only">Modul de răspuns</legend>
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
          <button type="button" class="btn" :disabled="busy" @click="refresh()">Reîncarcă</button>
          <button type="button" class="btn btn-danger" :disabled="busy" @click="clearAll">Șterge tot ce s-a primit</button>
        </div>
      </section>
    </div>

    <section class="mt-12">
      <h2 class="text-4xl">Donații primite</h2>
      <p class="mt-1 text-sm text-ink-soft">Câte una pe eventId; „primit de N ori” arată reîncercările și retrimiterile.</p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[48rem] text-left text-sm">
          <thead class="mono-label border-b border-ink">
            <tr>
              <th class="py-2 pr-4">Primit</th>
              <th class="py-2 pr-4">Sumă</th>
              <th class="py-2 pr-4">Campanie</th>
              <th class="py-2 pr-4">Donator</th>
              <th class="py-2 pr-4">Voluntar</th>
              <th class="py-2 pr-4">Detalii</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data?.events" :key="item.eventId" class="border-b border-ink/15 align-top">
              <td class="py-2 pr-4">
                {{ time(item.firstReceivedAt) }}
                <span v-if="item.eventType === 'donation.test'" class="mono-label ml-1 text-burgundy">test</span>
                <span v-if="item.timesReceived > 1" class="block text-ink-soft">primit de {{ item.timesReceived }} ori</span>
              </td>
              <td class="py-2 pr-4">
                {{ euro(item.payload.amount) }}
                <span class="block text-ink-soft">din care costuri {{ euro(item.payload.adminCosts) }}</span>
              </td>
              <td class="py-2 pr-4">
                {{ item.payload.campaign?.name }} <span class="text-ink-soft">({{ item.payload.campaign?.type }})</span>
                <span v-if="item.payload.personalCampaign" class="block text-ink-soft">{{ item.payload.personalCampaign.title }}</span>
              </td>
              <td class="py-2 pr-4">
                {{ donorLabel(item.payload) }}
                <span v-if="item.payload.wantsMonthly" class="block text-ink-soft">vrea lunar</span>
              </td>
              <td class="py-2 pr-4">
                {{ item.payload.volunteer ? item.payload.volunteer.name ?? 'fără nume' : '—' }}
              </td>
              <td class="py-2 pr-4">
                <details>
                  <summary class="cursor-pointer">JSON</summary>
                  <pre class="mt-2 max-w-md overflow-x-auto text-xs">{{ JSON.stringify(item.payload, null, 2) }}</pre>
                </details>
              </td>
            </tr>
            <tr v-if="!data?.events.length">
              <td colspan="6" class="py-4 text-ink-soft">Nimic primit încă. Trimite un eveniment de test din MIC2.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mt-12">
      <h2 class="text-4xl">Livrări</h2>
      <p class="mt-1 text-sm text-ink-soft">Fiecare cerere care a ajuns aici, inclusiv cele respinse. Fără conținut.</p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[48rem] text-left text-sm">
          <thead class="mono-label border-b border-ink">
            <tr>
              <th class="py-2 pr-4">Primit</th>
              <th class="py-2 pr-4">Eveniment</th>
              <th class="py-2 pr-4">Semnătură</th>
              <th class="py-2 pr-4">Ceas</th>
              <th class="py-2 pr-4">Răspuns</th>
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
                <span v-if="item.duplicate" class="block text-ink-soft">duplicat</span>
              </td>
              <td class="py-2 pr-4 font-mono text-xs">
                <span class="block">{{ item.deliveryId ?? '—' }}</span>
                <span class="block text-ink-soft">{{ item.eventId ?? '—' }}</span>
              </td>
            </tr>
            <tr v-if="!data?.deliveries.length">
              <td colspan="6" class="py-4 text-ink-soft">Nicio livrare încă.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
