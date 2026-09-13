import {
  boolean,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';

export const shoppingLists = pgTable(
  'shopping_lists',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('shopping_lists_owner_updated_at_idx').on(
      table.ownerUserId,
      table.updatedAt,
    ),
  ],
);
export const shoppingListItems = pgTable(
  'shopping_list_items',
  {
    id: text('id').primaryKey(),
    shoppingListId: text('shopping_list_id').notNull(),
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
    isChecked: boolean('is_checked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.shoppingListId],
      foreignColumns: [shoppingLists.id],
      name: 'shopping_list_items_list_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'shopping_list_items_product_id_fkey',
    }).onDelete('restrict'),
    uniqueIndex('shopping_list_items_list_product_unique')
      .on(table.shoppingListId, table.productId)
      .where(sql`${table.productId} is not null`),
    index('shopping_list_items_list_id_idx').on(table.shoppingListId),
    index('shopping_list_items_product_id_idx').on(table.productId),
  ],
);
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
