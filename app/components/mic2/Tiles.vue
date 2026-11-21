<script setup lang="ts">
// A grid of headline numbers for the MIC2 page, ruled like a ledger.
defineProps<{ tiles: { label: string; value: string; note?: string }[] }>()
</script>

<template>
  <dl class="grid grid-cols-2 gap-[1.5px] overflow-hidden rounded border-[1.5px] border-ink bg-ink sm:grid-cols-3">
    <div v-for="tile in tiles" :key="tile.label" class="bg-panel p-4 sm:p-5">
      <dt class="mono-label text-ink-soft">{{ tile.label }}</dt>
      <dd class="mt-2 font-display text-3xl leading-none tabular-nums sm:text-4xl">{{ tile.value }}</dd>
      <dd v-if="tile.note" class="mt-1.5 text-sm text-ink-soft">{{ tile.note }}</dd>
    </div>
  </dl>
</template>
