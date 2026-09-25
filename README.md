# Present Picker

Aplicația în care prietenii noștri aleg cadouri pentru petrecerea de intrare în casa nouă.

- **Noi definim invitații**, iar fiecare invitat își alege numele din listă, o singură dată, la prima deschidere a paginii (cu confirmare). Nu există conturi sau parole: e un grup de prieteni și fiecare are încredere în ceilalți.
- Invitații văd lista de idei, aleg unul sau mai multe cadouri, același cadou de mai multe ori, sau se combină mai mulți la același cadou. Dacă intră de pe alt telefon sau calculator, își aleg din nou numele și își regăsesc alegerile.
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

**Înainte să trimiți linkul, adaugă invitații** din `/admin` → *Invitați* (un nume pe rând). Până nu există invitați, nimeni nu poate alege cadouri. Un nume poate fi și al unui cuplu sau al unei familii, de exemplu „Ana și Mihai”.

### Testare de pe alte dispozitive (telefon, tabletă)

```bash
npm run dev:lan
```

Pornește același server, dar accesibil în rețeaua locală. În terminal apar adresa (`Network: http://192.168.x.x:3000`) și un cod QR: scanează-l cu telefonul. Dispozitivele trebuie să fie în aceeași rețea Wi-Fi.

- Merge pe HTTP simplu: cookie-urile și hot-reload-ul funcționează. Fiindcă nu e HTTPS, browserul nu consideră pagina „secure context”; aplicația nu are nevoie de asta.
- Adresa Mac-ului se vede și cu `ipconfig getifaddr en0`; pe dispozitivele Apple merge și numele `NumeleMac.local:3000`.
- Dacă nu se deschide: verifică să fie aceeași rețea (unele routere izolează dispozitivele, mai ales în rețeaua „guest”) și să permiți conexiunile de intrare pentru `node`, dacă macOS întreabă.
- Oricine e în aceeași rețea poate deschide site-ul, inclusiv `/admin` (protejat cu parola din `.env`). Folosește doar o rețea de încredere, nu una publică.
- Când folosești o bază de date cu date de test, e aceeași bază ca la `npm run dev` (`data/`).

Baza de date (`present-picker.db`) și pozele încărcate se salvează în folderul `data/` (sau unde indică `NUXT_DATA_DIR`). Baza se creează singură la prima pornire.

## Date de test

Ca să încerci aplicația cu conținut, fără să adaugi nimic de mână:

```bash
npm run db:seed              # adaugă 10 produse, 10 invitați, 8 alegeri și 3 poze generate
npm run db:seed -- --reset   # șterge TOT (produse, invitați, alegeri, poze) și seedează din nou
```

Scriptul folosește aceeași bază de date ca aplicația (`data/` sau `NUXT_DATA_DIR`) și refuză să scrie peste o bază care are deja produse, dacă nu îi dai `--reset`.

Ca să golești baza (produse, invitați, alegeri și poze încărcate), fără să adaugi nimic la loc:

```bash
npm run db:clean             # arată ce se șterge și cere să scrii „delete” pentru confirmare
npm run db:clean -- --yes    # fără întrebare (pentru scripturi)
```

Ștergerea nu se poate anula. **Nu rula `db:clean` și nici `db:seed -- --reset` pe baza cu datele reale ale petrecerii** (fă întâi o copie a folderului `data/`).

Invitații din seed sunt inventați. La prima deschidere a paginii alege oricare dintre ei ca să-i vezi alegerile ca fiind ale tale („Ales de tine”, anulare), sau alege unul fără alegeri (ultimii patru) ca să încerci de la zero. Pentru a-ți schimba identitatea în timpul testelor apasă „Nu ești tu?”.

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
scripts/               `db:seed` (date de test) și `db:clean` (golește baza)
```

Comenzi utile: `npm run typecheck`, `npm run db:generate` (după ce schimbi schema), `npm run db:seed` (date de test), `npm run db:clean` (golește baza).

## Design

Tema (culori, fonturi, forme) este într-un singur loc: [`app/assets/css/main.css`](app/assets/css/main.css). Designul urmează machetele „Catalog”.

Fonturile se descarcă la build și se servesc de pe serverul nostru. **Orice font nou trebuie să conțină literele românești** `ĂÂÎȘȚ` / `ăâîșț`: multe fonturi decorative nu au `Ț` și `ț`, iar browserul le înlocuiește pe ascuns cu alt font.
