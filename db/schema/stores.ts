import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const stores = pgTable(
  'stores',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    branchName: text('branch_name'),
    normalizedBranchName: text('normalized_branch_name'),
    address: text('address'),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('stores_owner_name_branch_unique').on(
      table.ownerUserId,
      table.normalizedName,
      table.normalizedBranchName,
    ),
    index('stores_owner_user_id_idx').on(table.ownerUserId),
  ],
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
