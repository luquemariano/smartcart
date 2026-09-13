import {
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { stores } from './stores';

export const shoppingSessionStatus = pgEnum('shopping_session_status', [
  'active',
  'completed',
]);

export const shoppingSessions = pgTable(
  'shopping_sessions',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    storeId: text('store_id'),
    status: shoppingSessionStatus('status').notNull().default('active'),
    budgetAmount: numeric('budget_amount', { precision: 19, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId],
      foreignColumns: [stores.id],
      name: 'shopping_sessions_store_id_fkey',
    }).onDelete('restrict'),
    uniqueIndex('shopping_sessions_one_active_per_owner_idx')
      .on(table.ownerUserId)
      .where(sql`${table.status} = 'active'`),
    index('shopping_sessions_owner_started_at_idx').on(
      table.ownerUserId,
      table.startedAt,
    ),
  ],
);

export type ShoppingSession = typeof shoppingSessions.$inferSelect;
export type NewShoppingSession = typeof shoppingSessions.$inferInsert;
