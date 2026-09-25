/**
 * Fills the database with sample products, guests and picks, for testing the app by hand.
 *
 *   npm run db:seed              seeds an empty database (refuses to touch one that already has products)
 *   npm run db:seed -- --reset   first deletes ALL products, picks and uploaded product images
 *
 * It uses the same database as the app: `./data`, or `NUXT_DATA_DIR` (also read from `.env`).
 * In the app, choose one of the seeded guests as "who you are" to see their picks as yours ("Ales de tine")
 * and to try cancelling; choose a guest without picks to try picking from scratch.
 */
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { crc32, deflateSync } from 'node:zlib'
import { openDatabase } from '../server/db/connect'
import { guests, picks, products } from '../server/db/schema'
import { databaseFile, dataDirectory, wipeData } from './lib/data'

type Rgb = [number, number, number]
type ImageKind = 'sunset' | 'stripes' | 'rings'

interface SeedPick {
  guest: string
  quantity?: number
  note?: string
}

interface SeedProduct {
  name: string
  description?: string
  link?: string
  /** Approximate price in whole lei. */
  price?: number
  image?: ImageKind
  picks?: SeedPick[]
}

// The names deliberately have Romanian diacritics, to test how they are displayed and searched.
// The last four have no picks, and the last one stands for a couple.
const GUESTS = [
  'Ana Țugulea',
  'Mihai Ștefan',
  'Ioana Popescu',
  'Andrei Ionescu',
  'Cristina Vasilescu',
  'Dan Șerban',
  'Elena Rusu',
  'Vlad Munteanu',
  'Ștefania Toma',
  'Radu și Miruna Pop',
]

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Pick-up pentru viniluri',
    description: 'Ca serile de duminică să aibă coloană sonoră.',
    link: 'https://www.emag.ro/',
    price: 850,
    image: 'rings',
    picks: [{ guest: 'Ana Țugulea' }],
  },
  {
    name: 'Șase căni din ceramică',
    description: 'Glazură în nuanțe de pământ, pentru cafeaua de dimineață.',
    price: 240,
    picks: [{ guest: 'Ioana Popescu', quantity: 2, note: 'Două seturi, unul e din partea bunicii' }],
  },
  {
    // Several guests on one product: this is the "cadou comun" state.
    name: 'Mixer planetar',
    description: 'Pentru cozonaci, prăjituri și experimentele de weekend.',
    link: 'https://www.emag.ro/',
    price: 4800,
    image: 'stripes',
    picks: [
      { guest: 'Mihai Ștefan', note: 'Ne combinăm cu Ana și Andrei' },
      { guest: 'Andrei Ionescu' },
      { guest: 'Cristina Vasilescu', note: 'Pun și eu partea mea' },
    ],
  },
  {
    // No price, no link, no picture: how the plainest card looks.
    name: 'Lampă-ciupercă',
    description: 'Vișinie, cu picior răsucit, pentru colțul de lângă canapea.',
  },
  {
    name: 'Taburet „bubble”',
    description: 'Masă mică, scaun în plus sau doar o pată de culoare.',
    price: 380,
  },
  {
    name: 'Lustră plisată',
    description: 'Lumină caldă, difuză, deasupra mesei.',
    price: 2400,
    picks: [{ guest: 'Dan Șerban' }, { guest: 'Ana Țugulea', note: 'Împreună cu Dan' }],
  },
  {
    name: 'Pahare de vin',
    description: 'Pentru toate toasturile care vor urma în casa asta.',
    price: 180,
    picks: [{ guest: 'Cristina Vasilescu', quantity: 6 }],
  },
  {
    name: 'Monstera mare',
    description: 'Colțul de lângă fereastră o așteaptă de la mutare.',
    price: 120,
    image: 'sunset',
  },
  {
    // Long texts, to check that the cards and the dialog cope with them.
    name: 'Set de tacâmuri din inox mat, 24 de piese, în cutie de cadou',
    description:
      'Furculițe, cuțite, linguri și lingurițe pentru șase persoane.\nFinisaj mat, care nu păstrează urmele de degete și merge la mașina de spălat vase.',
    link: 'https://www.emag.ro/',
    price: 690,
  },
  { name: 'Ceva mic pentru bucătărie' },
]

const COLORS = {
  sand: [235, 214, 168],
  sun: [217, 83, 43],
  burgundy: [123, 34, 38],
  forest: [34, 56, 44],
  mustard: [226, 177, 60],
  sage: [213, 216, 195],
} satisfies Record<string, Rgb>

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as Rgb

/** A few simple pictures in the app's palette, so cards with a photo can be tested without any network. */
const PAINTERS: Record<ImageKind, (x: number, y: number, w: number, h: number) => Rgb> = {
  // A setting sun over a sand-to-orange sky.
  sunset: (x, y, w, h) => {
    const distance = Math.hypot(x - w / 2, y - h * 0.8)
    return distance < w * 0.24 ? COLORS.burgundy : mix(COLORS.sand, COLORS.sun, y / h)
  },
  stripes: (x) => (Math.floor(x / 26) % 2 === 0 ? COLORS.forest : COLORS.mustard),
  rings: (x, y, w, h) => (Math.floor(Math.hypot(x - w / 2, y - h * 0.62) / 30) % 2 === 0 ? COLORS.sage : COLORS.forest),
}

/** Encodes an RGB image as PNG, using only Node's built-ins. */
function encodePng(width: number, height: number, paint: (x: number, y: number) => Rgb) {
  const stride = width * 3 + 1
  const raw = Buffer.alloc(stride * height) // each row starts with filter type 0 (none)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      raw.set(paint(x, y), y * stride + 1 + x * 3)
    }
  }

  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const checksum = Buffer.alloc(4)
    checksum.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, checksum])
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 2 // colour type: RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function main() {
  const reset = process.argv.includes('--reset')
  const directory = dataDirectory()
  const uploads = join(directory, 'uploads')
  const db = openDatabase(directory)

  console.log(`Database: ${databaseFile(directory)}`)

  const existingProducts = db.select().from(products).all().length
  const existingGuests = db.select().from(guests).all().length
  if ((existingProducts > 0 || existingGuests > 0) && !reset) {
    console.error(
      `\nThe database already has ${existingProducts} product(s) and ${existingGuests} guest(s), so nothing was changed.\n` +
        'Run "npm run db:seed -- --reset" to delete everything and seed again.',
    )
    process.exitCode = 1
    return
  }

  if (reset) {
    const removed = await wipeData(db, directory)
    console.log(
      `Reset: deleted ${removed.products} product(s), ${removed.guests} guest(s), ${removed.picks} pick(s) and ${removed.images} image(s).`,
    )
  }

  await mkdir(uploads, { recursive: true })
  const images = new Map<ImageKind, string>()
  const imageFor = async (kind: ImageKind) => {
    let path = images.get(kind)
    if (!path) {
      const name = `${randomBytes(16).toString('hex')}.png`
      const [width, height] = [480, 528] // same proportions as the arch frames
      await writeFile(join(uploads, name), encodePng(width, height, (x, y) => PAINTERS[kind](x, y, width, height)))
      path = `/uploads/${name}`
      images.set(kind, path)
    }
    return path
  }

  const guestIds = new Map<string, number>()
  for (const name of GUESTS) {
    guestIds.set(name, db.insert(guests).values({ name }).returning({ id: guests.id }).get().id)
  }

  let pickCount = 0
  for (const item of PRODUCTS) {
    const created = db
      .insert(products)
      .values({
        name: item.name,
        description: item.description ?? null,
        link: item.link ?? null,
        price: item.price ?? null,
        image: item.image ? await imageFor(item.image) : null,
      })
      .returning({ id: products.id })
      .get()

    for (const pick of item.picks ?? []) {
      db.insert(picks)
        .values({
          productId: created.id,
          guestId: guestIds.get(pick.guest)!,
          quantity: pick.quantity ?? 1,
          note: pick.note ?? null,
        })
        .run()
      pickCount++
    }
  }

  console.log(`Seeded ${PRODUCTS.length} products, ${GUESTS.length} guests, ${pickCount} picks and ${images.size} pictures.`)
  console.log('Start the app with "npm run dev" (no restart needed if it is already running).')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
