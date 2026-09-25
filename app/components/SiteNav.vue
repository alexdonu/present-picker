<script setup lang="ts">
const { event } = useAppConfig()
const hasDetails = Boolean(event.when || event.where || event.rsvpBy)
</script>

<template>
  <nav
    class="mono-label flex items-center justify-between gap-4 border-b border-ink px-5 py-1 sm:px-12 sm:py-4 sm:text-[13px] xl:px-20"
    aria-label="Navigare principală"
  >
    <NuxtLink to="/" class="flex min-h-11 items-center">
      <span class="sm:hidden">Catalog · Vol. 01</span>
      <span class="hidden sm:inline">Catalog de casă nouă · Vol. 01</span>
    </NuxtLink>

    <span v-if="event.hosts" class="hidden font-display text-[26px] normal-case italic tracking-normal lg:block">{{ event.hosts }}</span>

    <div class="flex items-center gap-5 sm:gap-8">
      <NuxtLink to="/#cadouri" class="flex min-h-11 items-center">Cadouri<span class="sm:hidden">&nbsp;→</span></NuxtLink>
      <NuxtLink to="/#cum-merge" class="hidden sm:block">Cum merge</NuxtLink>
      <NuxtLink v-if="hasDetails" to="/#detalii" class="hidden sm:block">Petrecerea</NuxtLink>
    </div>
  </nav>
</template>
