<script setup lang="ts">
// Horizontal bars for the MIC2 page: one row per category, the longest bar being the largest value.
export type Mic2BarRow = { key: string; label: string; hint?: string; value: number; display: string; note?: string; sub?: string }

const props = withDefaults(defineProps<{ rows: Mic2BarRow[]; tone?: 'forest' | 'burgundy' | 'mustard'; empty?: string }>(), {
  tone: 'forest',
  empty: 'Nothing yet.',
})

const max = computed(() => Math.max(0, ...props.rows.map(r => r.value)))
const toneClass = computed(() => ({ forest: 'bg-forest', burgundy: 'bg-burgundy', mustard: 'bg-mustard' })[props.tone])
</script>

<template>
  <ul class="space-y-3">
    <li v-for="row in rows" :key="row.key">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span class="min-w-0 break-words">
          {{ row.label }}
          <span v-if="row.hint" class="font-mono text-xs text-ink-soft">{{ row.hint }}</span>
        </span>
        <span class="shrink-0 tabular-nums">
          <strong>{{ row.display }}</strong>
          <span v-if="row.note" class="text-ink-soft"> · {{ row.note }}</span>
        </span>
      </div>
      <div class="mt-1 h-2.5 rounded-sm bg-highlight">
        <div class="h-full rounded-sm" :class="toneClass" :style="{ width: max ? `${(row.value / max) * 100}%` : '0' }" />
      </div>
      <p v-if="row.sub" class="mt-1 text-xs text-ink-soft">{{ row.sub }}</p>
    </li>
    <li v-if="!rows.length" class="text-sm text-ink-soft">{{ empty }}</li>
  </ul>
</template>
