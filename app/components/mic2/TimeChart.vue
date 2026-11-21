<script setup lang="ts">
// A column per time bucket for the MIC2 page, with an optional line on its own scale (e.g. a running total).
// Columns are HTML so they stay crisp at any width; the line is an SVG stretched over them.
export type Mic2TimePoint = { key: string; axis: string; title: string; value: number; line?: number }

const props = withDefaults(defineProps<{
  points: Mic2TimePoint[]
  barLegend: string
  lineLegend?: string
  tone?: 'forest' | 'burgundy'
  empty?: string
}>(), { tone: 'forest', empty: 'Nothing yet.' })

const maxValue = computed(() => Math.max(0, ...props.points.map(p => p.value)))
const maxLine = computed(() => Math.max(0, ...props.points.map(p => p.line ?? 0)))
const hasLine = computed(() => props.points.some(p => p.line !== undefined))

const linePoints = computed(() =>
  props.points
    .map((p, i) => `${((i + 0.5) / props.points.length) * 100},${100 - (maxLine.value ? ((p.line ?? 0) / maxLine.value) * 100 : 0)}`)
    .join(' '))

// About six axis labels, whatever the number of columns.
const axisLabels = computed(() => {
  const step = Math.max(1, Math.ceil(props.points.length / 6))
  return props.points
    .map((p, i) => ({ key: p.key, text: p.axis, left: ((i + 0.5) / props.points.length) * 100 }))
    .filter((_, i) => i % step === 0)
})

const height = (value: number) => (maxValue.value && value ? `max(2px, ${(value / maxValue.value) * 100}%)` : '0')
</script>

<template>
  <div>
    <p v-if="!points.length" class="text-sm text-ink-soft">{{ empty }}</p>
    <template v-else>
      <div class="relative h-56 border-b border-l border-ink">
        <div class="absolute inset-0 flex items-end gap-px">
          <div
            v-for="point in points"
            :key="point.key"
            class="flex h-full flex-1 items-end hover:bg-highlight"
            :title="point.title"
            :aria-label="point.title"
            role="img"
          >
            <div class="w-full" :class="tone === 'forest' ? 'bg-forest' : 'bg-burgundy'" :style="{ height: height(point.value) }" />
          </div>
        </div>
        <svg
          v-if="hasLine"
          class="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline :points="linePoints" fill="none" stroke="var(--color-mustard)" stroke-width="3" vector-effect="non-scaling-stroke" />
        </svg>
      </div>
      <div class="relative mt-1 h-5 font-mono text-[11px] text-ink-soft">
        <span v-for="label in axisLabels" :key="label.key" class="absolute -translate-x-1/2 whitespace-nowrap" :style="{ left: `${label.left}%` }">
          {{ label.text }}
        </span>
      </div>
      <p class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
        <span><span class="mr-1.5 inline-block size-3 align-middle" :class="tone === 'forest' ? 'bg-forest' : 'bg-burgundy'" />{{ barLegend }}</span>
        <span v-if="hasLine && lineLegend"><span class="mr-1.5 inline-block h-0.5 w-4 align-middle bg-mustard" />{{ lineLegend }}</span>
      </p>
    </template>
  </div>
</template>
