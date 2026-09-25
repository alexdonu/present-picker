# Present Picker

Nuxt 4 app (Vue 3, Nitro, Tailwind 4) where guests pick housewarming gifts. SQLite via Drizzle. See `README.md` for setup.

## Conventions

- **Everything the end user sees is hardcoded Romanian** (no i18n). Code, identifiers, comments and commit messages are English.
- Romanian text must use the comma-below letters `ș ț` (U+0219/U+021B), not the cedilla `ş ţ`.
- **Every font must contain `ĂÂÎȘȚ ăâîșț`.** Check with fonttools before adding one (`pip install fonttools brotli`, then read the `cmap` of each woff2 subset). Shrikhand looked right but has no `Ț ț`, and the browser silently substituted another font.
- The look lives in `app/assets/css/main.css` (theme tokens + component classes such as `.btn`, `.panel`, `.arch`). Fonts are registered in `nuxt.config.ts` (`fonts.families`) and must be kept in sync with `--font-*` in the CSS.
- Party details (hosts, date, place) come from `app/app.config.ts`; empty values hide their section.

## Behaviour to preserve

- Guests need no account. A random token in an httpOnly cookie (`pp_guest`) ties picks to a browser; only its holder can cancel them. The token is never sent to clients, only a `mine` flag.
- The same product can be picked by many guests, and one guest can pick it several times (quantity). Repeating a pick (same browser, same name) merges into the existing one.
- Admin is one shared password (`NUXT_ADMIN_PASSWORD`) and a sealed session cookie. `server/middleware/admin-auth.ts` protects every `/api/admin/*` route except login/logout/session, so new admin endpoints are protected by default.
- The page must always show, in very large type, that buying a gift is not mandatory and that being there matters most (`NoObligationStatement.vue`).

## Gotchas

- Typed Nitro routes hit "Excessive stack depth" on `$fetch` with template-literal URLs; pass the URL as a `string` variable (see `app/pages/admin/index.vue`).
- TypeScript is pinned to 5.x: `vue-tsc` does not work with TypeScript 7 yet.
- Migrations are read from `./drizzle` relative to the working directory, so start the server from the project root.
- Server uploads are validated by their magic bytes, stored under `<dataDir>/uploads` with random names and served by `server/routes/uploads/[file].get.ts`.

## Commands

`npm run dev` · `npm run build` · `npm start` · `npm run typecheck` · `npm run db:generate` (after editing `server/db/schema.ts`)
