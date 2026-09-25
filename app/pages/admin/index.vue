<script setup lang="ts">
import type { PublicProduct } from '#shared/types/product'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Administrare · Present Picker' })

const { data: products, refresh } = await useFetch<PublicProduct[]>('/api/admin/products')
const error = ref('')

const TINTS = ['bg-tint-sand', 'bg-tint-blush', 'bg-tint-sage', 'bg-tint-linen']

/** People who picked at least one gift (the same name typed twice counts once). */
const guestCount = computed(
  () => new Set((products.value ?? []).flatMap((product) => product.picks.map((pick) => pick.guestName.toLocaleLowerCase('ro')))).size,
)

/** Nitro's typed routes choke on template-literal URLs; typing the address as a plain string avoids that. */
const remove = (url: string) => $fetch(url, { method: 'DELETE' })

async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
    await refresh()
  } catch (e) {
    if (isUnauthorized(e)) return navigateTo('/admin/login')
    error.value = errorMessage(e)
  }
}

function removeProduct(product: PublicProduct) {
  const picked = product.picks.length
    ? ` Sunt ${product.picks.length} alegeri făcute pentru el, care se vor șterge și ele.`
    : ''
  if (!window.confirm(`Ștergi produsul „${product.name}”?${picked}`)) return
  return run(() => remove(`/api/admin/products/${product.id}`))
}

function removePick(pickId: number, guestName: string) {
  if (!window.confirm(`Ștergi alegerea lui ${guestName}?`)) return
  return run(() => remove(`/api/admin/picks/${pickId}`))
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="eyebrow">Administrare</p>
        <h1 class="mt-2 text-6xl leading-none">Produse</h1>
        <p class="mono-label mt-3 sm:text-[13px]">
          {{ products?.length ?? 0 }} produse · {{ guestCount }} {{ guestCount === 1 ? 'invitat a ales' : 'invitați au ales' }}
        </p>
      </div>
      <NuxtLink to="/admin/products/new" class="btn btn-primary">Adaugă produs</NuxtLink>
    </div>

    <p v-if="error" class="notice-error mt-6" role="alert">{{ error }}</p>

    <p v-if="!products?.length" class="mt-10 font-display text-3xl italic text-ink-soft">Nu ai adăugat niciun produs încă. Începe cu butonul de mai sus.</p>

    <ul v-else class="mt-10 space-y-5">
      <li v-for="(product, index) in products" :key="product.id" class="panel p-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="arch relative w-20 shrink-0 overflow-hidden" :class="TINTS[index % TINTS.length]">
            <img
              v-if="product.image"
              :src="product.image"
              alt=""
              referrerpolicy="no-referrer"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div v-else class="ruled absolute inset-0" aria-hidden="true" />
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="text-3xl leading-[1.05]">{{ product.name }}</h2>
            <p class="mono-label mt-1.5 text-ink-soft">
              <span v-if="product.price !== null">~ {{ formatPrice(product.price) }} · </span>
              {{ product.picks.length }} {{ product.picks.length === 1 ? 'alegere' : 'alegeri' }}
              ({{ product.totalQuantity }} buc.)
            </p>
          </div>

          <div class="flex gap-2">
            <NuxtLink :to="`/admin/products/${product.id}`" class="btn btn-small">Editează</NuxtLink>
            <button type="button" class="btn btn-small btn-danger" @click="removeProduct(product)">Șterge</button>
          </div>
        </div>

        <details v-if="product.picks.length" class="mt-4 border-t border-ink pt-3">
          <summary class="mono-label cursor-pointer py-1">Cine a ales</summary>
          <ul class="mt-3 space-y-2">
            <li v-for="pick in product.picks" :key="pick.id" class="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{{ pick.guestName }}</strong>
                <span v-if="pick.quantity > 1"> · {{ pick.quantity }} buc.</span>
                <span v-if="pick.note" class="font-display text-lg italic text-ink-soft"> · „{{ pick.note }}”</span>
              </span>
              <button type="button" class="text-link text-burgundy" @click="removePick(pick.id, pick.guestName)">Șterge alegerea</button>
            </li>
          </ul>
        </details>
      </li>
    </ul>
  </div>
</template>
