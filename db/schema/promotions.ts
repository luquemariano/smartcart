import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { products } from './products';
import { stores } from './stores';

export const promotions = pgTable(
  'promotions',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'restrict' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    type: text('type').notNull(),
    value: numeric('value', { precision: 19, scale: 2 }),
    buyQuantity: numeric('buy_quantity', { precision: 9, scale: 0 }),
    payQuantity: numeric('pay_quantity', { precision: 9, scale: 0 }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('promotions_owner_store_product_idx').on(
      table.ownerUserId,
      table.storeId,
      table.productId,
    ),
    index('promotions_owner_dates_idx').on(
      table.ownerUserId,
      table.startsAt,
      table.endsAt,
    ),
  ],
);

export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;
