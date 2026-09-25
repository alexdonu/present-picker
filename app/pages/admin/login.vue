<script setup lang="ts">
useHead({ title: 'Autentificare · Present Picker' })

const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    await navigateTo('/admin')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-5 py-14 sm:py-20">
    <form class="panel space-y-6 p-6 sm:p-8" @submit.prevent="submit">
      <div>
        <p class="eyebrow">Administrare</p>
        <h1 class="mt-2 text-5xl leading-none">Intră în catalog</h1>
        <p class="mt-3 text-ink-muted">Această zonă este doar pentru noi, gazdele.</p>
      </div>

      <div>
        <label for="password" class="field-label">Parola</label>
        <input id="password" v-model="password" class="field" type="password" autocomplete="current-password" required />
      </div>

      <p v-if="error" class="notice-error" role="alert">{{ error }}</p>

      <button type="submit" class="btn btn-primary w-full" :disabled="submitting">{{ submitting ? 'Se verifică…' : 'Intră' }}</button>
    </form>
  </main>
</template>
