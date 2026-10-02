<script setup lang="ts">
// The MIC2 webhook playground's own frame: in English and without the party admin's navigation, since it is
// shared with people who only have access to this page.
useHead({ htmlAttrs: { lang: 'en' } })

async function logout() {
  await $fetch('/api/mic2/logout', { method: 'POST' })
  await navigateTo('/admin/mic2/login')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <nav class="mono-label flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ink px-5 py-3 sm:px-12 sm:py-4 sm:text-[13px] xl:px-20">
      <NuxtLink to="/admin/mic2" class="flex min-h-9 items-center">MIC2 webhook playground</NuxtLink>
      <button type="button" class="mono-label flex min-h-9 cursor-pointer items-center underline underline-offset-4 hover:text-burgundy" @click="logout">Sign out</button>
    </nav>

    <main class="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <slot />
    </main>
  </div>
</template>
