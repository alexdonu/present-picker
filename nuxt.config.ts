import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  // Fonts are downloaded at build time and served from our own server.
  // Every font here MUST contain the Romanian letters ĂÂÎȘȚ/ăâîșț (Ț and ț are missing from many display fonts,
  // and browsers then silently mix in another font). Check with fonttools before adding or changing one.
  fonts: {
    families: [
      { name: 'Instrument Serif', provider: 'google', weights: [400], styles: ['normal', 'italic'], subsets: ['latin', 'latin-ext'] },
      { name: 'Space Mono', provider: 'google', weights: [400, 700], styles: ['normal'], subsets: ['latin', 'latin-ext'] },
      { name: 'DM Sans', provider: 'google', weights: [400, 500, 700], styles: ['normal'], subsets: ['latin', 'latin-ext'] },
    ],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ro' },
      title: 'Casa nouă · Present Picker',
      meta: [
        { name: 'description', content: 'Alege un cadou pentru petrecerea de intrare în casa nouă.' },
        // This is a private page for our friends: keep it (and the names on it) out of search engines.
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'theme-color', content: '#f3ede3' },
      ],
    },
  },

  // Private values. Override with NUXT_ADMIN_PASSWORD, NUXT_SESSION_SECRET, NUXT_DATA_DIR.
  runtimeConfig: {
    adminPassword: '',
    sessionSecret: '',
    dataDir: './data',
  },

  routeRules: {
    // The admin area is a client-only app; every admin API call is still authenticated on the server.
    '/admin/**': { ssr: false },
  },
})
