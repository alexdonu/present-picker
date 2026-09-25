<script setup lang="ts">
import { MAX_PICK_QUANTITY, pickSchema } from '#shared/schemas'
import type { PublicProduct } from '#shared/types/product'

const emit = defineEmits<{ picked: [payload: { name: string; product: PublicProduct }] }>()

const dialog = ref<HTMLDialogElement>()
const product = ref<PublicProduct>()
const { name: rememberedName, remember } = useGuestName()

const name = ref('')
const quantity = ref(1)
const note = ref('')
const error = ref('')
const submitting = ref(false)

function open(target: PublicProduct) {
  product.value = target
  name.value = rememberedName.value
  quantity.value = 1
  note.value = ''
  error.value = ''
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

/** Clicking the dimmed area outside the box closes the dialog. */
function closeOnBackdropClick(event: MouseEvent) {
  if (event.target === dialog.value) close()
}

async function submit() {
  if (!product.value || submitting.value) return

  const parsed = pickSchema.safeParse({ name: name.value, quantity: quantity.value, note: note.value })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Verifică datele introduse.'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await $fetch(`/api/products/${product.value.id}/picks`, { method: 'POST', body: parsed.data })
    remember(parsed.data.name)
    emit('picked', { name: parsed.data.name, product: product.value })
    close()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="dialog panel" aria-labelledby="pick-dialog-title" @click="closeOnBackdropClick">
    <form class="space-y-6 p-5 sm:p-8" novalidate @submit.prevent="submit">
      <div>
        <p class="eyebrow">Îl aleg eu</p>
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

      <div>
        <label for="guest-name" class="field-label">Numele tău</label>
        <input id="guest-name" v-model="name" class="field" type="text" autocomplete="name" maxlength="60" placeholder="ex: Ana Popescu" />
      </div>

      <div>
        <span id="quantity-label" class="field-label">Câte bucăți?</span>
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
        <button type="submit" class="btn btn-primary" :disabled="submitting">{{ submitting ? 'Se salvează…' : 'Confirm alegerea' }}</button>
      </div>
    </form>
  </dialog>
</template>
