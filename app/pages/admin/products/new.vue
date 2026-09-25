<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Produs nou · Present Picker' })
</script>

<template>
  <div>
    <p class="eyebrow">Administrare</p>
    <h1 class="mt-2 text-6xl leading-none">Produs nou</h1>
    <AdminProductForm class="mt-10" @saved="navigateTo('/admin')" />
  </div>
</template>
