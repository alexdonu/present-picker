import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  /** Where the product can be bought. Always an http(s) URL. */
  link: text('link'),
  /** Approximate price in whole lei. */
  price: integer('price'),
  /** Either an http(s) URL or a `/uploads/<file>` path of an image uploaded by an admin. */
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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
