<script setup lang="ts">
async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <nav class="mono-label flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ink px-5 py-3 sm:px-12 sm:py-4 sm:text-[13px] xl:px-20">
      <NuxtLink to="/admin" class="flex min-h-9 items-center">Administrare · Catalog de casă nouă</NuxtLink>
      <div class="flex items-center gap-5 sm:gap-8">
        <NuxtLink to="/" class="flex min-h-9 items-center">Pagina invitaților</NuxtLink>
        <button type="button" class="mono-label flex min-h-9 cursor-pointer items-center underline underline-offset-4 hover:text-burgundy" @click="logout">Deconectare</button>
      </div>
    </nav>

    <main class="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <slot />
    </main>

    <div class="checker" aria-hidden="true" />
  </div>
</template>
