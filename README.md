# Present Picker

Aplicația în care prietenii noștri aleg cadouri pentru petrecerea de intrare în casa nouă.

- Invitații văd lista de idei, aleg unul sau mai multe cadouri, același cadou de mai multe ori, sau se combină mai mulți la același cadou. Nu au nevoie de cont: își scriu doar numele.
- Pagina spune, cu litere foarte mari, că **nu este obligatoriu să cumpere nimic** și că cel mai important este să vină.
- Noi, gazdele, adăugăm produsele (poză, link, preț) și vedem cine ce a ales din `/admin`.
- Tot ce vede utilizatorul final este în română; codul este în engleză.

Construită cu [Nuxt 4](https://nuxt.com) (Vue 3), Tailwind CSS 4 și SQLite (Drizzle ORM).

## Pornire locală

Ai nevoie de Node 22.9 sau mai nou.

```bash
npm install
cp .env.example .env
```

Deschide `.env` și completează:

- `NUXT_ADMIN_PASSWORD`: parola comună a administratorilor.
- `NUXT_SESSION_SECRET`: o cheie secretă de cel puțin 32 de caractere. O generezi cu `openssl rand -hex 32`.

Apoi:

```bash
npm run dev
```

Pagina invitaților e pe http://localhost:3000, iar administrarea pe http://localhost:3000/admin.

Baza de date (`present-picker.db`) și pozele încărcate se salvează în folderul `data/` (sau unde indică `NUXT_DATA_DIR`). Baza se creează singură la prima pornire.

## Detaliile petrecerii

Data, adresa, numele gazdelor și contactul se completează în [`app/app.config.ts`](app/app.config.ts). Ce rămâne gol nu se afișează pe pagină.

## Pe un server propriu

Fiindcă baza de date e un fișier SQLite, aplicația trebuie să ruleze pe un server cu disc persistent (un VPS, un Raspberry Pi etc.), nu pe platforme serverless.

```bash
npm ci
npm run build
npm start
```

- Rulează comenzile din rădăcina proiectului: aplicația citește migrările din `drizzle/` relativ la folderul curent.
- `npm start` citește variabilele din `.env` dacă există. Poți să le dai și direct în mediu (`NUXT_ADMIN_PASSWORD`, `NUXT_SESSION_SECRET`, `NUXT_DATA_DIR`).
- Portul implicit este 3000 (`PORT=8080 npm start` îl schimbă).
- Pune în față un reverse proxy cu HTTPS (Caddy, nginx, Cloudflare Tunnel etc.). Cookie-urile devin `Secure` automat când conexiunea este HTTPS.
- Copia de siguranță înseamnă să salvezi tot folderul `data/`.

## Structura proiectului

```
app/                  interfața (Vue): pagini, componente, tema în assets/css/main.css
server/api/           API-ul (Nitro): public, iar cel de administrare sub /api/admin
server/db/schema.ts   schema bazei de date
drizzle/              migrările SQL generate
shared/               validări și tipuri folosite și de front, și de server
```

Comenzi utile: `npm run typecheck`, `npm run db:generate` (după ce schimbi schema).

## Design

Tema (culori, fonturi, forme) este într-un singur loc: [`app/assets/css/main.css`](app/assets/css/main.css). Designul urmează machetele „Catalog”.

Fonturile se descarcă la build și se servesc de pe serverul nostru. **Orice font nou trebuie să conțină literele românești** `ĂÂÎȘȚ` / `ăâîșț`: multe fonturi decorative nu au `Ț` și `ț`, iar browserul le înlocuiește pe ascuns cu alt font.
