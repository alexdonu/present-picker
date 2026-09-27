<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Aspect · Present Picker' })

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const { data: settings, refresh } = await useFetch<{ heroImageUrl: string | null }>('/api/settings')

const file = ref<File>()
const error = ref('')
const saving = ref(false)
const removing = ref(false)

const filePreview = computed(() => (file.value ? URL.createObjectURL(file.value) : undefined))
onBeforeUnmount(() => filePreview.value && URL.revokeObjectURL(filePreview.value))
const preview = computed(() => filePreview.value ?? settings.value?.heroImageUrl ?? undefined)

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  if (selected && selected.size > MAX_IMAGE_BYTES) {
    error.value = 'Imaginea este prea mare (maxim 8 MB).'
    input.value = ''
    return
  }
  error.value = ''
  file.value = selected
}

async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
    await refresh()
  } catch (e) {
    if (isUnauthorized(e)) return navigateTo('/admin/login')
    error.value = errorMessage(e)
  }
}

async function save() {
  if (!file.value) return
  saving.value = true
  const body = new FormData()
  body.set('image', file.value)
  await run(() => $fetch('/api/admin/settings/hero-image', { method: 'PUT', body }))
  file.value = undefined
  saving.value = false
}

async function remove() {
  if (!window.confirm('Revii la desenul decorativ implicit?')) return
  removing.value = true
  await run(() => $fetch('/api/admin/settings/hero-image', { method: 'DELETE' }))
  removing.value = false
}
</script>

<template>
  <div>
    <p class="eyebrow">Administrare</p>
    <h1 class="mt-2 text-6xl leading-none">Aspect</h1>
    <p class="mt-3 max-w-2xl text-ink-muted">
      Imaginea din arcul de pe pagina principală. Dacă nu alegi una, rămâne desenul decorativ.
    </p>

    <div class="panel mt-10 max-w-xl space-y-5 p-5 sm:p-8">
      <div class="arch relative mx-auto w-48 overflow-hidden bg-tint-sand">
        <img v-if="preview" :src="preview" alt="Previzualizare imagine arc" class="absolute inset-0 h-full w-full object-cover" />
        <p v-else class="ruled absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-ink-soft">
          Fără imagine — se arată desenul decorativ
        </p>
      </div>

      <div>
        <label for="hero-file" class="field-label">Încarcă o poză</label>
        <input
          id="hero-file"
          class="field"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          @change="onFileChange"
        />
        <p class="mt-1 text-sm text-ink-soft">JPG, PNG, WebP sau GIF, maxim 8 MB. Va fi decupată în forma arcului.</p>
      </div>

      <p v-if="error" class="notice-error" role="alert">{{ error }}</p>

      <div class="flex flex-wrap gap-3">
        <button type="button" class="btn btn-primary" :disabled="!file || saving" @click="save">
          {{ saving ? 'Se salvează…' : 'Salvează' }}
        </button>
        <button v-if="settings?.heroImageUrl" type="button" class="btn btn-danger" :disabled="removing" @click="remove">
          {{ removing ? 'Se șterge…' : 'Șterge imaginea' }}
        </button>
      </div>
    </div>
  </div>
</template>
