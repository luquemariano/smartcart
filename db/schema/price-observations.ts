import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products';
import { stores } from './stores';
import { shoppingItems } from './shopping-items';
import { shoppingSessions } from './shopping-sessions';

export const priceObservations = pgTable(
  'price_observations',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    productId: text('product_id').notNull(),
    storeId: text('store_id').notNull(),
    unitPrice: numeric('unit_price', { precision: 19, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    source: varchar('source', { length: 40 }).notNull(),
    shoppingSessionId: text('shopping_session_id'),
    shoppingItemId: text('shopping_item_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'price_observations_product_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.storeId],
      foreignColumns: [stores.id],
      name: 'price_observations_store_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.shoppingSessionId],
      foreignColumns: [shoppingSessions.id],
      name: 'price_observations_session_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.shoppingItemId],
      foreignColumns: [shoppingItems.id],
      name: 'price_observations_item_id_fkey',
    }).onDelete('set null'),
    index('price_observations_owner_product_observed_idx').on(
      table.ownerUserId,
      table.productId,
      table.observedAt,
    ),
    index('price_observations_owner_store_product_observed_idx').on(
      table.ownerUserId,
      table.storeId,
      table.productId,
      table.observedAt,
    ),
    uniqueIndex('price_observations_item_unique')
      .on(table.shoppingItemId)
      .where(sql`${table.shoppingItemId} IS NOT NULL`),
  ],
);

export type PriceObservation = typeof priceObservations.$inferSelect;
