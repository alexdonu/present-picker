<script setup lang="ts">
import type { PublicProduct } from '#shared/types/product'

const { event } = useAppConfig()
const { data: products, refresh, error } = await useFetch<PublicProduct[]>('/api/products')

/** Backgrounds for the arch frames, cycled so neighbouring cards differ. */
const TINTS = ['bg-tint-sand', 'bg-tint-blush', 'bg-tint-sage', 'bg-tint-linen']

const STEPS = [
  'Răsfoiești lista de idei. Sunt doar sugestii.',
  'Apeși „Îl aleg eu”. Poți alege mai multe cadouri, același cadou de mai multe ori sau te poți combina cu alți prieteni.',
  'Și, mai ales, vii la petrecere. Asta contează cel mai mult.',
]

const hasDetails = Boolean(event.when || event.where || event.rsvpBy)
const details = [
  { label: 'Când', value: event.when },
  { label: 'Unde', value: event.where },
  { label: 'Confirmă', value: event.rsvpBy },
].filter((detail) => detail.value)

const total = computed(() => products.value?.length ?? 0)
const withPicks = computed(() => products.value?.filter((product) => product.picks.length).length ?? 0)
const mineCount = computed(() => products.value?.filter((product) => product.picks.some((pick) => pick.mine)).length ?? 0)
const marquee = computed(() => {
  const names = (products.value ?? []).map((product) => product.name)
  return [...names, ...names].join(' · ')
})

const pickDialog = useTemplateRef('pickDialog')
const flash = ref('')
let flashTimer: ReturnType<typeof setTimeout> | undefined

function showFlash(message: string) {
  flash.value = message
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = ''), 8000)
}

async function onPicked({ name, product }: { name: string; product: PublicProduct }) {
  showFlash(`Mulțumim, ${name}! Ai ales „${product.name}”. Ne bucurăm oricum că vii!`)
  await refresh()
}

async function cancelPick(pickId: number) {
  if (!window.confirm('Sigur vrei să anulezi această alegere?')) return
  try {
    await $fetch(`/api/picks/${pickId}`, { method: 'DELETE' })
    showFlash('Alegerea a fost anulată.')
  } catch (e) {
    showFlash(errorMessage(e))
  }
  await refresh()
}

onBeforeUnmount(() => clearTimeout(flashTimer))
</script>

<template>
  <main>
    <!-- Nr. 01 — announcement -->
    <header class="mx-auto grid max-w-[1440px] gap-6 px-5 pb-12 pt-9 sm:px-12 sm:pb-20 sm:pt-16 lg:grid-cols-[1fr_auto] lg:grid-rows-[1fr_auto] lg:gap-x-16 xl:px-20">
      <div class="flex flex-col gap-6 sm:gap-8 lg:col-start-1 lg:row-start-1">
        <p class="eyebrow">Nr. 01 — Anunț</p>
        <h1 class="text-[104px] leading-[0.84] tracking-[-0.035em] sm:text-[150px] xl:text-[200px]">
          Ne-am<br /><em class="pl-14 sm:pl-24 xl:pl-[120px]">mutat.</em>
        </h1>
        <p class="max-w-[520px] text-[17px] leading-[1.6] sm:text-xl">
          <span class="bg-highlight">Am adunat aici câteva idei de lucruri care ne-ar face noul cămin mai al nostru. Dacă vrei să alegi ceva, spune-ne
          care — iar noi ne bucurăm oricum că vii.</span>
        </p>
      </div>

      <HeroArch class="lg:col-start-2 lg:row-span-2 lg:row-start-1" />

      <dl
        v-if="hasDetails"
        id="detalii"
        class="grid scroll-mt-8 grid-cols-1 border-t border-ink sm:grid-cols-3 sm:gap-8 sm:pt-5 lg:col-start-1 lg:row-start-2"
      >
        <div
          v-for="detail in details"
          :key="detail.label"
          class="flex items-baseline justify-between gap-4 border-b border-ink py-3 sm:flex-col sm:items-stretch sm:justify-start sm:gap-1.5 sm:border-b-0 sm:py-0"
        >
          <dt class="mono-label text-ink-soft sm:text-xs">{{ detail.label }}</dt>
          <dd class="text-right font-display text-[22px] sm:text-left sm:text-[28px]">{{ detail.value }}</dd>
        </div>
      </dl>
    </header>

    <NoObligationStatement />

    <div v-if="marquee" class="mono-label overflow-hidden whitespace-nowrap bg-burgundy py-3.5 text-xs tracking-[0.2em] text-paper sm:py-4 sm:text-sm" aria-hidden="true">
      {{ marquee }}
    </div>

    <!-- Nr. 02 — the catalog -->
    <section id="cadouri" class="mx-auto max-w-[1440px] scroll-mt-4 px-5 pb-20 pt-16 sm:px-12 sm:pb-28 sm:pt-24 xl:px-20" aria-labelledby="catalog-title">
      <div class="flex flex-col justify-between gap-4 sm:gap-6 lg:flex-row lg:items-end lg:gap-12">
        <div class="flex flex-col gap-3.5 sm:gap-4">
          <p class="eyebrow">Nr. 02 — Catalogul</p>
          <h2 id="catalog-title" class="text-[56px] leading-[0.92] tracking-[-0.02em] sm:text-[96px]">
            Ce ne-ar face casa <em>mai acasă</em>
          </h2>
        </div>
        <div v-if="total" class="flex flex-col gap-2 lg:items-end lg:gap-3">
          <p class="mono-label sm:text-[13px]">{{ total }} idei · {{ withPicks }} alese deja de prieteni</p>
          <p v-if="mineCount" class="font-display text-[22px] italic text-forest sm:text-2xl">
            Mulțumim — ai ales {{ mineCount === 1 ? 'un cadou' : `${mineCount} cadouri` }}.
          </p>
        </div>
      </div>

      <p v-if="error" class="notice-error mt-10" role="alert">Nu am putut încărca lista de cadouri. Reîncarcă pagina peste câteva clipe.</p>
      <p v-else-if="!total" class="mt-10 font-display text-3xl italic text-ink-soft">Lista de cadouri se pregătește. Revino curând!</p>
      <div v-else class="mt-8 grid grid-cols-2 gap-x-[18px] gap-y-11 sm:mt-14 sm:gap-x-10 sm:gap-y-[72px] md:grid-cols-3 xl:grid-cols-4">
        <ProductCard
          v-for="(product, index) in products"
          :key="product.id"
          :product="product"
          :number="index + 1"
          :tint="TINTS[index % TINTS.length]!"
          @pick="pickDialog?.open($event)"
          @cancel="cancelPick"
        />
      </div>
    </section>

    <!-- Nr. 03 — how it works -->
    <section id="cum-merge" class="wallpaper scroll-mt-4 text-paper" aria-labelledby="how-title">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-14 sm:px-12 sm:py-24 lg:flex-row lg:gap-20 xl:px-20">
        <div class="flex flex-col gap-4 lg:w-[440px] lg:shrink-0">
          <p class="eyebrow text-mustard!">Nr. 03 — Instrucțiuni</p>
          <h2 id="how-title" class="text-[52px] leading-[0.95] sm:text-[80px]">Cum <em>funcționează</em></h2>
        </div>
        <ol class="flex-1 border-b border-paper/45">
          <li v-for="(step, index) in STEPS" :key="index" class="flex items-baseline gap-4 border-t border-paper/45 py-[18px] sm:gap-8 sm:py-6">
            <span class="font-mono text-xs text-mustard sm:text-sm">({{ String(index + 1).padStart(2, '0') }})</span>
            <span class="font-display text-[25px] leading-[1.2] sm:text-[34px]">{{ step }}</span>
          </li>
        </ol>
      </div>
    </section>

    <!-- Closing statement -->
    <footer class="mx-auto max-w-[1440px] px-5 pb-12 pt-16 sm:px-12 sm:pb-16 sm:pt-24 xl:px-20">
      <h2 class="text-[64px] leading-[0.92] tracking-[-0.03em] sm:text-[128px]">
        Cel mai frumos cadou <em class="text-burgundy">e să vii.</em>
      </h2>
      <div class="mt-9 flex flex-col gap-3 border-t border-ink pt-4 sm:mt-14 sm:flex-row sm:items-end sm:justify-between sm:pt-5">
        <p v-if="event.contact" class="mono-label sm:text-[13px]">Întrebări? {{ event.contact }}</p>
        <span v-else />
        <p class="font-display text-[30px] sm:text-[40px]">
          <em>cu drag,</em> <template v-if="event.hosts">{{ event.hosts }}</template>
        </p>
      </div>
    </footer>

    <PickDialog ref="pickDialog" @picked="onPicked" />

    <Transition name="flash">
      <p
        v-if="flash"
        class="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-lg rounded-[4px] border-[1.5px] border-ink bg-forest p-4 text-center font-display text-xl text-paper"
        role="status"
      >
        {{ flash }}
      </p>
    </Transition>
  </main>
</template>

<style scoped>
.flash-enter-active,
.flash-leave-active {
  transition:
    opacity 200ms,
    transform 200ms;
}
.flash-enter-from,
.flash-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>
