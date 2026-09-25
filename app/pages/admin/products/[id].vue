<script setup lang="ts">
import type { AdminProductFormValues } from '~/components/admin/ProductForm.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Editează produs · Present Picker' })

const route = useRoute()
const { data: product, error } = await useFetch<AdminProductFormValues>(`/api/admin/products/${route.params.id}`)
</script>

<template>
  <div>
    <p class="eyebrow">Administrare</p>
    <h1 class="mt-2 text-6xl leading-none">Editează produsul</h1>
    <p v-if="error || !product" class="notice-error mt-10" role="alert">
      Nu am găsit produsul. <NuxtLink to="/admin" class="text-link">Înapoi la listă</NuxtLink>
    </p>
    <AdminProductForm v-else class="mt-10" :product="product" @saved="navigateTo('/admin')" />
  </div>
</template>
