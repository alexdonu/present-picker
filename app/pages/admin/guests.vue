<script setup lang="ts">
import type { AdminGuest } from '#shared/types/guest'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Invitați · Present Picker' })

const { data: guests, refresh } = await useFetch<AdminGuest[]>('/api/admin/guests')

const names = ref('')
const adding = ref(false)
const error = ref('')
const info = ref('')

const editingId = ref<number>()
const editName = ref('')

const withPicks = computed(() => guests.value?.filter((guest) => guest.pickCount > 0).length ?? 0)

/** Nitro's typed routes choke on template-literal URLs; typing the address as a plain string avoids that. */
const send = (url: string, method: 'PUT' | 'DELETE', body?: object) => $fetch(url, { method, body })

async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
    await refresh()
    return true
  } catch (e) {
    if (isUnauthorized(e)) await navigateTo('/admin/login')
    else error.value = errorMessage(e)
    return false
  }
}

async function add() {
  adding.value = true
  info.value = ''
  const ok = await run(async () => {
    const { added, skipped } = await $fetch<{ added: string[]; skipped: string[] }>('/api/admin/guests', {
      method: 'POST',
      body: { names: names.value },
    })
    info.value =
      `Am adăugat ${added.length === 1 ? 'un invitat' : `${added.length} invitați`}.` +
      (skipped.length ? ` Erau deja în listă: ${skipped.join(', ')}.` : '')
  })
  if (ok) names.value = ''
  adding.value = false
}

function startEdit(guest: AdminGuest) {
  editingId.value = guest.id
  editName.value = guest.name
  info.value = ''
}

async function saveEdit() {
  if (editingId.value === undefined) return
  const id = editingId.value
  if (await run(() => send(`/api/admin/guests/${id}`, 'PUT', { name: editName.value }))) editingId.value = undefined
}

function remove(guest: AdminGuest) {
  const picked = guest.pickCount ? ` Are ${guest.pickCount} alegeri, care se vor șterge și ele.` : ''
  if (!window.confirm(`Scoți „${guest.name}” din lista de invitați?${picked}`)) return
  info.value = ''
  return run(() => send(`/api/admin/guests/${guest.id}`, 'DELETE'))
}
</script>

<template>
  <div>
    <p class="eyebrow">Administrare</p>
    <h1 class="mt-2 text-6xl leading-none">Invitați</h1>
    <p class="mono-label mt-3 sm:text-[13px]">
      {{ guests?.length ?? 0 }} invitați · {{ withPicks }} au ales deja ceva
    </p>
    <p class="mt-4 max-w-2xl text-ink-muted">
      Invitații își aleg numele din această listă la prima deschidere a paginii. Un nume poate fi și al unui cuplu sau
      al unei familii, de exemplu „Ana și Mihai”.
    </p>

    <form class="panel mt-8 max-w-2xl space-y-4 p-5 sm:p-6" @submit.prevent="add">
      <div>
        <label for="names" class="field-label">Adaugă invitați (unul pe rând)</label>
        <textarea id="names" v-model="names" class="field" rows="5" placeholder="Ana Popescu&#10;Mihai Ionescu&#10;Radu și Miruna Pop" />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="adding || !names.trim()">{{ adding ? 'Se adaugă…' : 'Adaugă în listă' }}</button>
    </form>

    <p v-if="error" class="notice-error mt-6" role="alert">{{ error }}</p>
    <p v-if="info" class="mt-6 font-display text-2xl italic text-forest" role="status">{{ info }}</p>

    <p v-if="!guests?.length" class="mt-10 font-display text-3xl italic text-ink-soft">
      Lista e goală. Până nu adaugi invitați, nimeni nu poate alege cadouri.
    </p>

    <ul v-else class="mt-10 divide-y divide-ink/25 border-y border-ink">
      <li v-for="guest in guests" :key="guest.id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <form v-if="editingId === guest.id" class="flex min-w-0 flex-1 flex-wrap items-center gap-2" @submit.prevent="saveEdit">
          <label :for="`guest-${guest.id}`" class="sr-only">Numele invitatului</label>
          <input :id="`guest-${guest.id}`" v-model="editName" class="field min-w-48 flex-1" type="text" maxlength="60" required />
          <button type="submit" class="btn btn-small btn-primary">Salvează</button>
          <button type="button" class="btn btn-small" @click="editingId = undefined">Renunț</button>
        </form>

        <template v-else>
          <p class="min-w-0">
            <strong class="text-lg">{{ guest.name }}</strong>
            <span class="mono-label ml-2 text-ink-soft">
              {{ guest.pickCount ? `${guest.pickCount} ${guest.pickCount === 1 ? 'alegere' : 'alegeri'}` : 'nicio alegere' }}
            </span>
          </p>
          <div class="flex gap-2">
            <button type="button" class="btn btn-small" @click="startEdit(guest)">Editează</button>
            <button type="button" class="btn btn-small btn-danger" @click="remove(guest)">Șterge</button>
          </div>
        </template>
      </li>
    </ul>
  </div>
</template>
