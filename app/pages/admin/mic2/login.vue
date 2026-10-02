<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Sign in · MIC2 webhook', htmlAttrs: { lang: 'en' } })

const login = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/mic2/login', { method: 'POST', body: { login: login.value, password: password.value } })
    await navigateTo('/admin/mic2')
  } catch (e) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Something went wrong. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-5 py-14 sm:py-20">
    <form class="panel space-y-6 p-6 sm:p-8" @submit.prevent="submit">
      <div>
        <p class="eyebrow">MIC2 webhook playground</p>
        <h1 class="mt-2 text-5xl leading-none">Sign in</h1>
        <p class="mt-3 text-ink-muted">A test receiver for the MIC2 Donation webhook.</p>
      </div>

      <div>
        <label for="login" class="field-label">Login</label>
        <input id="login" v-model="login" class="field" type="email" autocomplete="username" required />
      </div>

      <div>
        <label for="password" class="field-label">Password</label>
        <input id="password" v-model="password" class="field" type="password" autocomplete="current-password" required />
      </div>

      <p v-if="error" class="notice-error" role="alert">{{ error }}</p>

      <button type="submit" class="btn btn-primary w-full" :disabled="submitting">{{ submitting ? 'Checking…' : 'Sign in' }}</button>
    </form>
  </main>
</template>
