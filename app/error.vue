<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)
useHead({ title: 'Casa nouă · Present Picker' })
</script>

<template>
  <NuxtLayout>
    <main class="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 class="text-[96px] leading-none">{{ notFound ? 'Hopa!' : 'Ups…' }}</h1>
      <p class="mt-6 font-display text-3xl italic">
        {{ notFound ? 'Pagina pe care o cauți nu există.' : 'Ceva nu a mers cum trebuie. Încearcă din nou în câteva clipe.' }}
      </p>
      <button type="button" class="btn btn-primary mt-10" @click="clearError({ redirect: '/' })">Înapoi la lista de cadouri</button>
    </main>
  </NuxtLayout>
</template>
