import { sql } from 'drizzle-orm'
import { blob, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * An image kept in the database: a product photo or the hero image. A given row is never edited in place — a
 * replacement always becomes a new row — so the URL it is served from (`/api/images/{id}`) can be cached by
 * browsers forever.
 */
export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  data: blob('data', { mode: 'buffer' }).notNull(),
  /** e.g. 'image/jpeg'. Detected from the file's bytes when it is uploaded, not trusted from the browser. */
  contentType: text('content_type').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  /** Where the product can be bought. Always an http(s) URL. */
  link: text('link'),
  /** Approximate price in whole lei. */
  price: integer('price'),
  /** A photo an admin uploaded, kept in `images`. At most one of `imageId`/`imageUrl` is set at a time. */
  imageId: integer('image_id').references(() => images.id, { onDelete: 'set null' }),
  /** A remote http(s) URL an admin pasted instead of uploading a photo. */
  imageUrl: text('image_url'),
  /** How many are needed in total, across every guest's picks. Once reached, nobody can pick (more of) it. */
  neededQuantity: integer('needed_quantity'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

/** Site-wide settings. Always exactly one row, with id 1. */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  /** The photo shown in the hero arch on the guest page, instead of the default decorative art. */
  heroImageId: integer('hero_image_id').references(() => images.id, { onDelete: 'set null' }),
})

/**
 * The people invited to the party, defined by the admins. Visitors choose who they are from this list
 * (there is no password: it is a group of friends, and anyone may say they are anyone).
 * A name can also stand for a couple or a family, e.g. "Ana și Mihai".
 */
export const guests = sqliteTable(
  'guests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    /** Free text (formats vary: +373 xx xxx xxx, 0xxxxxxxx, ...). Shown to other guests once they self-identify. */
    phone: text('phone'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex('guests_name_unique').on(table.name)],
)

/**
 * A guest choosing to bring a product. Many guests can pick the same product, but each guest has at most one
 * pick per product: picking it again adds to the quantity.
 */
export const picks = sqliteTable(
  'picks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    guestId: integer('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index('picks_product_id_idx').on(table.productId),
    uniqueIndex('picks_product_guest_unique').on(table.productId, table.guestId),
  ],
)
