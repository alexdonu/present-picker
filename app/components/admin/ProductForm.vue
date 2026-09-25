<script lang="ts">
export interface AdminProductFormValues {
  id: number
  name: string
  description: string | null
  link: string | null
  price: number | null
  image: string | null
}
</script>

<script setup lang="ts">
const props = defineProps<{ product?: AdminProductFormValues }>()
const emit = defineEmits<{ saved: [] }>()

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const name = ref(props.product?.name ?? '')
const description = ref(props.product?.description ?? '')
const link = ref(props.product?.link ?? '')
const price = ref(props.product?.price?.toString() ?? '')
// An uploaded image has no address worth showing; only a pasted (remote) one is editable here.
const imageUrl = ref(props.product?.image?.startsWith('http') ? props.product.image : '')
const removeImage = ref(false)
const file = ref<File>()

const error = ref('')
const submitting = ref(false)

const filePreview = computed(() => (file.value ? URL.createObjectURL(file.value) : undefined))
onBeforeUnmount(() => filePreview.value && URL.revokeObjectURL(filePreview.value))

const currentImage = computed(() => (removeImage.value ? undefined : props.product?.image))
const preview = computed(() => filePreview.value ?? (imageUrl.value || currentImage.value) ?? undefined)

function onFileChange(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (selected && selected.size > MAX_IMAGE_BYTES) {
    error.value = 'Imaginea este prea mare (maxim 8 MB).'
    ;(event.target as HTMLInputElement).value = ''
    return
  }
  error.value = ''
  file.value = selected
}

async function submit() {
  submitting.value = true
  error.value = ''

  const body = new FormData()
  body.set('name', name.value)
  body.set('description', description.value)
  body.set('link', link.value)
  body.set('price', price.value)
  body.set('imageUrl', imageUrl.value)
  body.set('removeImage', String(removeImage.value))
  if (file.value) body.set('image', file.value)

  try {
    await $fetch(props.product ? `/api/admin/products/${props.product.id}` : '/api/admin/products', {
      method: props.product ? 'PUT' : 'POST',
      body,
    })
    emit('saved')
  } catch (e) {
    if (isUnauthorized(e)) return navigateTo('/admin/login')
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="panel max-w-2xl space-y-6 p-5 sm:p-8" @submit.prevent="submit">
    <div>
      <label for="name" class="field-label">Numele produsului</label>
      <input id="name" v-model="name" class="field" type="text" maxlength="120" required />
    </div>

    <div>
      <label for="description" class="field-label">Descriere <span class="normal-case tracking-normal">(opțional)</span></label>
      <textarea id="description" v-model="description" class="field" rows="3" maxlength="1000" />
    </div>

    <div>
      <label for="link" class="field-label">Link către produs <span class="normal-case tracking-normal">(opțional)</span></label>
      <input id="link" v-model="link" class="field" type="url" placeholder="https://…" />
    </div>

    <div>
      <label for="price" class="field-label">Preț aproximativ, în lei <span class="normal-case tracking-normal">(opțional)</span></label>
      <input id="price" v-model="price" class="field max-w-48" type="text" inputmode="decimal" placeholder="ex: 150" />
    </div>

    <fieldset class="space-y-4 border border-dashed border-ink p-4">
      <legend class="mono-label px-2">Imagine</legend>

      <img v-if="preview" :src="preview" alt="Previzualizare imagine" referrerpolicy="no-referrer" class="max-h-48 rounded-[4px] border-[1.5px] border-ink bg-paper" />

      <div>
        <label for="image-file" class="field-label">Încarcă o poză</label>
        <input
          id="image-file"
          class="field"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          @change="onFileChange"
        />
        <p class="mt-1 text-sm text-ink-soft">JPG, PNG, WebP sau GIF, maxim 8 MB.</p>
      </div>

      <div>
        <label for="image-url" class="field-label">…sau lipește adresa unei imagini</label>
        <input id="image-url" v-model="imageUrl" class="field" type="url" placeholder="https://…" />
        <p class="mt-1 text-sm text-ink-soft">Dacă alegi ambele, se folosește poza încărcată.</p>
      </div>

      <label v-if="product?.image" class="flex items-center gap-2 font-bold">
        <input v-model="removeImage" type="checkbox" class="size-5 accent-burgundy" />
        Șterge imaginea actuală
      </label>
    </fieldset>

    <p v-if="error" class="notice-error" role="alert">{{ error }}</p>

    <div class="flex flex-wrap gap-3">
      <button type="submit" class="btn btn-primary" :disabled="submitting">{{ submitting ? 'Se salvează…' : 'Salvează' }}</button>
      <NuxtLink to="/admin" class="btn">Renunț</NuxtLink>
    </div>
  </form>
</template>
