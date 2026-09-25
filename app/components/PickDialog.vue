<script setup lang="ts">
import { MAX_PICK_QUANTITY, pickSchema } from '#shared/schemas'
import type { Guest } from '#shared/types/guest'
import type { PublicProduct } from '#shared/types/product'

const props = defineProps<{
  /** Who the visitor chose to be; the page makes sure there is one before opening this dialog. */
  guest?: Guest
  /** All products, as loaded by the page: the dialog reads its product from here so it always shows fresh picks. */
  products: PublicProduct[]
}>()
const emit = defineEmits<{
  picked: [product: PublicProduct]
  cancelled: [product: PublicProduct]
  /** "Not you?": the visitor wants to choose another name for this pick. */
  switch: [product: PublicProduct]
}>()

const dialog = ref<HTMLDialogElement>()
const productId = ref<number>()
const product = computed(() => props.products.find((candidate) => candidate.id === productId.value))
/** The visitor's own pick on this product, if they already made one. */
const mine = computed(() => product.value?.picks.find((pick) => pick.mine))

const quantity = ref(1)
const note = ref('')
const error = ref('')
const submitting = ref(false)
const confirmingCancel = ref(false)
const cancelling = ref(false)

function open(target: PublicProduct) {
  productId.value = target.id
  quantity.value = 1
  note.value = ''
  error.value = ''
  confirmingCancel.value = false
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

/** "Not you?": hands over to the identity dialog, which brings this dialog back once a name is chosen. */
function switchIdentity() {
  if (!product.value) return
  emit('switch', product.value)
  close()
}

/** Clicking the dimmed area outside the box closes the dialog. */
function closeOnBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

async function submit() {
  if (!product.value || submitting.value) return

  const parsed = pickSchema.safeParse({ quantity: quantity.value, note: note.value })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Verifică datele introduse.'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await $fetch(`/api/products/${product.value.id}/picks`, { method: 'POST', body: parsed.data })
    emit('picked', product.value)
    close()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}

/** Cancels the visitor's own pick without leaving the dialog first. */
async function cancelPick() {
  if (!product.value || !mine.value || cancelling.value) return

  cancelling.value = true
  error.value = ''
  try {
    await $fetch(`/api/picks/${mine.value.id}`, { method: 'DELETE' })
    emit('cancelled', product.value)
    close()
  } catch (e) {
    error.value = errorMessage(e)
    confirmingCancel.value = false
  } finally {
    cancelling.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="dialog panel" aria-labelledby="pick-dialog-title" @click="closeOnBackdropClick">
    <form class="space-y-6 p-5 sm:p-8" novalidate @submit.prevent="submit">
      <div>
        <p class="eyebrow">{{ mine ? 'Alegerea ta' : 'Îl aleg eu' }}</p>
        <h2 id="pick-dialog-title" class="mt-2 text-4xl leading-[1] sm:text-5xl">{{ product?.name }}</h2>
        <p v-if="product?.description" class="mt-3 whitespace-pre-line text-ink-muted">{{ product.description }}</p>
        <a v-if="product?.link" :href="product.link" target="_blank" rel="noopener noreferrer" class="text-link mt-2 inline-block">
          Vezi produsul ↗
        </a>
      </div>

      <p class="bg-highlight p-3 text-sm leading-relaxed">
        <span class="mono-label mr-1 text-burgundy">Reține</span>
        Nu ești obligat să cumperi niciun cadou. E doar o sugestie, iar cel mai important este că vii!
      </p>

      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-ink bg-highlight px-4 py-3">
        <p>
          <span class="mono-label block text-ink-soft">Alegi ca</span>
          <strong class="text-lg">{{ guest?.name }}</strong>
        </p>
        <button v-if="product" type="button" class="text-link" @click="switchIdentity">Nu ești tu?</button>
      </div>

      <div v-if="mine" class="space-y-3 border-[1.5px] border-forest p-4">
        <p>
          <span class="mono-label block text-forest">Ai ales deja</span>
          <strong class="text-lg">{{ mine.quantity }} {{ mine.quantity === 1 ? 'bucată' : 'bucăți' }}</strong>
          <span v-if="mine.note" class="block font-display text-xl italic text-ink-soft">„{{ mine.note }}”</span>
        </p>

        <button v-if="!confirmingCancel" type="button" class="btn btn-small btn-danger" @click="confirmingCancel = true">
          Anulează alegerea
        </button>
        <div v-else class="flex flex-wrap items-center gap-x-3 gap-y-2" role="group" aria-label="Confirmă anularea">
          <span class="font-bold">Sigur anulezi alegerea?</span>
          <button type="button" class="btn btn-small" :disabled="cancelling" @click="confirmingCancel = false">Nu</button>
          <button type="button" class="btn btn-small btn-danger" :disabled="cancelling" @click="cancelPick">
            {{ cancelling ? 'Se anulează…' : 'Da, anulează' }}
          </button>
        </div>
      </div>

      <div>
        <span id="quantity-label" class="field-label">{{ mine ? 'Câte bucăți vrei să mai adaugi?' : 'Câte bucăți?' }}</span>
        <div class="flex items-center gap-4" role="group" aria-labelledby="quantity-label">
          <button type="button" class="btn btn-icon" aria-label="Mai puține" :disabled="quantity <= 1" @click="quantity--">−</button>
          <output class="min-w-8 text-center font-display text-4xl" aria-live="polite">{{ quantity }}</output>
          <button type="button" class="btn btn-icon" aria-label="Mai multe" :disabled="quantity >= MAX_PICK_QUANTITY" @click="quantity++">+</button>
        </div>
      </div>

      <div>
        <label for="guest-note" class="field-label">Mențiune <span class="normal-case tracking-normal">(opțional)</span></label>
        <input id="guest-note" v-model="note" class="field" type="text" maxlength="200" placeholder="ex: Ne combinăm cu Mihai" />
        <p class="mt-2 text-sm text-ink-soft">
          Poți alege același cadou ca alți prieteni: numele tuturor apar lângă el, așa vă puteți combina.
        </p>
      </div>

      <p v-if="error" class="notice-error" role="alert">{{ error }}</p>

      <div class="flex flex-wrap justify-end gap-3">
        <button type="button" class="btn" @click="close">Renunț</button>
        <button type="submit" class="btn btn-primary" :disabled="submitting">{{ submitting ? 'Se salvează…' : mine ? 'Adaugă la alegere' : 'Confirm alegerea' }}</button>
      </div>
    </form>
  </dialog>
</template>
