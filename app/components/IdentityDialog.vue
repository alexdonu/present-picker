<script setup lang="ts">
import type { Guest } from '#shared/types/guest'

const props = defineProps<{ current?: Guest }>()
const emit = defineEmits<{
  chosen: [guest: Guest]
  /** The dialog closed, whether or not a name was chosen. */
  closed: []
}>()

const dialog = ref<HTMLDialogElement>()
const confirmButton = ref<HTMLButtonElement>()
const guests = ref<Guest[]>([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
/** The name picked in the list, waiting for the visitor to confirm it. */
const selected = ref<Guest>()
const firstVisit = ref(false)

/** Lowercase and without diacritics, so typing "stefan" finds "Ștefan". */
const simplify = (text: string) => text.toLocaleLowerCase('ro').normalize('NFD').replace(/\p{Diacritic}/gu, '')

const visible = computed(() => {
  const query = simplify(search.value.trim())
  return query ? guests.value.filter((guest) => simplify(guest.name).includes(query)) : guests.value
})

async function loadGuests() {
  loading.value = true
  error.value = ''
  try {
    guests.value = await $fetch<Guest[]>('/api/guests')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

/**
 * Opens the dialog. With `firstVisit` (the automatic opening for someone who has not chosen a name yet) it stays
 * closed when there is nobody to choose from, and resolves to whether it opened.
 */
async function open(options: { firstVisit?: boolean } = {}) {
  search.value = ''
  selected.value = undefined
  firstVisit.value = options.firstVisit ?? false

  if (firstVisit.value) {
    await loadGuests()
    if (error.value || guests.value.length === 0) return false
    dialog.value?.showModal()
    return true
  }
  dialog.value?.showModal()
  await loadGuests()
  return true
}

function close() {
  dialog.value?.close()
}

/** Clicking the dimmed area outside the box closes the dialog. */
function closeOnBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

async function select(guest: Guest) {
  if (guest.id === props.current?.id) return close() // already them: nothing to change
  selected.value = guest
  error.value = ''
  await nextTick()
  confirmButton.value?.focus()
}

async function confirm() {
  if (!selected.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/me', { method: 'PUT', body: { guestId: selected.value.id } })
    emit('chosen', selected.value)
    close()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog panel"
    aria-labelledby="identity-title"
    @click="closeOnBackdropClick"
    @close="emit('closed')"
  >
    <!-- Step 2: confirm the chosen name -->
    <div v-if="selected" class="space-y-6 p-5 sm:p-8">
      <div>
        <p class="eyebrow">Confirmă</p>
        <h2 id="identity-title" class="mt-2 text-4xl leading-[1.05] sm:text-5xl">Ești {{ selected.name }}?</h2>
        <p class="mt-3 text-ink-muted">
          Alegerile tale vor apărea sub acest nume și vei fi recunoscut(ă) și de pe alte dispozitive. Îl poți schimba
          oricând din pagină.
        </p>
      </div>

      <p v-if="error" class="notice-error" role="alert">{{ error }}</p>

      <div class="flex flex-wrap justify-end gap-3">
        <button type="button" class="btn" :disabled="saving" @click="selected = undefined">Nu, alt nume</button>
        <button ref="confirmButton" type="button" class="btn btn-primary" :disabled="saving" @click="confirm">
          {{ saving ? 'Se salvează…' : 'Da, sunt eu' }}
        </button>
      </div>
    </div>

    <!-- Step 1: choose a name from the guest list -->
    <div v-else class="space-y-5 p-5 sm:p-8">
      <div>
        <p class="eyebrow">{{ firstVisit ? 'Bine ai venit' : 'Invitații' }}</p>
        <h2 id="identity-title" class="mt-2 text-4xl leading-none sm:text-5xl">Cine ești?</h2>
        <p class="mt-3 text-ink-muted">
          Alege-ți numele din listă, o singură dată. Așa se vede cine ce a ales, iar dacă intri de pe alt telefon sau
          calculator, îți regăsești alegerile la fel de ușor.
        </p>
      </div>

      <div v-if="guests.length > 8">
        <label for="guest-search" class="field-label">Caută-ți numele</label>
        <input id="guest-search" v-model="search" class="field" type="search" autocomplete="off" placeholder="ex: Ana" />
      </div>

      <p v-if="loading" class="text-ink-soft" role="status">Se încarcă lista…</p>
      <p v-else-if="error" class="notice-error" role="alert">{{ error }}</p>
      <p v-else-if="!guests.length" class="font-display text-2xl italic text-ink-soft">
        Lista invitaților nu e pregătită încă. Revino peste puțin timp!
      </p>
      <ul v-else class="max-h-[40vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
        <li v-for="guest in visible" :key="guest.id">
          <button
            type="button"
            class="btn w-full justify-between text-left"
            :class="{ 'btn-primary': guest.id === current?.id }"
            :aria-current="guest.id === current?.id ? 'true' : undefined"
            @click="select(guest)"
          >
            <span>{{ guest.name }}</span>
            <svg v-if="guest.id === current?.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </button>
        </li>
        <li v-if="!visible.length" class="py-2 text-ink-soft">Niciun nume nu se potrivește cu ce ai scris.</li>
      </ul>

      <p v-if="guests.length" class="text-sm text-ink-soft">Nu ești în listă? Spune-ne și te adăugăm.</p>

      <div class="flex justify-end">
        <button type="button" class="btn" @click="close">{{ firstVisit ? 'Doar mă uit' : 'Renunț' }}</button>
      </div>
    </div>
  </dialog>
</template>
