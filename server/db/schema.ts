import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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

/** A guest choosing to bring a product. Many picks (from many guests) can point to the same product. */
export const picks = sqliteTable(
  'picks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    guestName: text('guest_name').notNull(),
    quantity: integer('quantity').notNull().default(1),
    note: text('note'),
    /** Random secret kept in the guest's cookie; whoever holds it can cancel this pick. Never sent to clients. */
    ownerToken: text('owner_token').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index('picks_product_id_idx').on(table.productId)],
)
