<script setup lang="ts">
import type { PublicProduct } from '#shared/types/product'

const props = defineProps<{
  product: PublicProduct
  /** Position in the catalog, starting at 1. */
  number: number
  /** Tailwind background class for the frame behind the picture. */
  tint: string
}>()

defineEmits<{
  pick: [product: PublicProduct]
  cancel: [pickId: number]
}>()

const isMine = computed(() => props.product.picks.some((pick) => pick.mine))
const isShared = computed(() => props.product.picks.length > 1)

const status = computed(() => (props.product.picks.length ? `Ales de ${props.product.picks.length}` : 'Liber'))
const buttonLabel = computed(() => (props.product.picks.length ? 'Pun și eu →' : 'Îl aleg eu →'))
</script>

<template>
  <article class="flex flex-col gap-2.5 sm:gap-3.5">
    <div class="arch relative flex items-center justify-center overflow-hidden" :class="tint">
      <div v-if="!product.image" class="ruled absolute inset-0" aria-hidden="true" />
      <!-- no-referrer: some shops refuse to show their pictures on other sites. -->
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        loading="lazy"
        referrerpolicy="no-referrer"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <svg
        v-else
        viewBox="0 0 64 64"
        class="relative size-[72px] sm:size-[120px]"
        fill="none"
        stroke="var(--color-ink)"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="9" y="26" width="46" height="28" rx="3" />
        <rect x="6" y="18" width="52" height="9" rx="3" />
        <path d="M32 18v36M32 18c-6-11-17-9-14-3 2 4 9 3 14 3zm0 0c6-11 17-9 14-3-2 4-9 3-14 3z" />
      </svg>

      <span
        v-if="isShared"
        class="mono-label absolute bottom-5 left-1/2 -translate-x-1/2 rotate-[-10deg] whitespace-nowrap border-[1.5px] border-burgundy bg-paper px-2.5 py-1.5 font-bold text-burgundy sm:bottom-9 sm:border-2 sm:px-4 sm:py-2 sm:text-[13px] sm:tracking-[0.2em]"
      >
        Cadou comun
      </span>
    </div>

    <div class="mono-label flex justify-between border-b border-ink pb-1.5 text-[10px] sm:pb-2.5 sm:text-xs">
      <span>Nr. {{ String(number).padStart(2, '0') }}</span>
      <span class="text-ink-soft">{{ status }}</span>
    </div>

    <h3 class="text-2xl leading-[1.02] sm:text-[32px]">{{ product.name }}</h3>

    <p v-if="product.description" class="hidden whitespace-pre-line text-[15px] leading-[1.55] text-ink-muted sm:block">
      {{ product.description }}
    </p>

    <a v-if="product.link" :href="product.link" target="_blank" rel="noopener noreferrer" class="text-link self-start">
      Vezi produsul ↗
    </a>

    <ul v-if="product.picks.length" class="space-y-1.5 text-[13px] leading-snug sm:text-sm">
      <li v-for="pick in product.picks" :key="pick.id">
        <span class="font-bold">{{ pick.guestName }}</span>
        <span v-if="pick.quantity > 1"> · {{ pick.quantity }} buc.</span>
        <span v-if="pick.mine" class="font-bold text-forest"> (tu)</span>
        <span v-if="pick.note" class="block font-display text-base italic text-ink-soft sm:text-lg">„{{ pick.note }}”</span>
        <button v-if="pick.mine" type="button" class="text-link text-burgundy" @click="$emit('cancel', pick.id)">Anulează</button>
      </li>
    </ul>

    <div class="mt-auto flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2.5">
      <span v-if="product.price !== null" class="whitespace-nowrap font-mono text-xs font-bold sm:text-sm" title="Preț aproximativ">~ {{ formatPrice(product.price) }}</span>
      <span v-else class="hidden sm:block" />

      <button
        v-if="isMine"
        type="button"
        class="btn btn-primary w-full whitespace-nowrap sm:w-auto"
        aria-label="Ales de tine. Apasă ca să adaugi încă."
        @click="$emit('pick', product)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        Ales de tine
      </button>
      <button v-else type="button" class="btn w-full whitespace-nowrap sm:w-auto" @click="$emit('pick', product)">{{ buttonLabel }}</button>
    </div>
  </article>
</template>
