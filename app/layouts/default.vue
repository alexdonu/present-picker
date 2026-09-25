<template>
  <div class="flex min-h-dvh flex-col">
    <SiteNav />

    <div class="flex-1">
      <slot />
    </div>

    <div class="checker" aria-hidden="true" />
  </div>
</template>
