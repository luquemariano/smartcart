import {
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { products } from './products';
import { shoppingSessions } from './shopping-sessions';

export const shoppingItems = pgTable(
  'shopping_items',
  {
    id: text('id').primaryKey(),
    shoppingSessionId: text('shopping_session_id').notNull(),
    productId: text('product_id'),
    productName: text('product_name').notNull(),
    productBrand: text('product_brand'),
    productBarcode: text('product_barcode'),
    productQuantityValue: numeric('product_quantity_value', {
      precision: 19,
      scale: 4,
    }),
    productQuantityUnit: text('product_quantity_unit'),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 19, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.shoppingSessionId],
      foreignColumns: [shoppingSessions.id],
      name: 'shopping_items_session_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'shopping_items_product_id_fkey',
    }).onDelete('restrict'),
    unique('shopping_items_session_product_unique').on(
      table.shoppingSessionId,
      table.productId,
    ),
    index('shopping_items_session_id_idx').on(table.shoppingSessionId),
    index('shopping_items_product_id_idx').on(table.productId),
  ],
);

export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type NewShoppingItem = typeof shoppingItems.$inferInsert;
