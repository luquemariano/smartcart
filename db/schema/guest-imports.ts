import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const guestImports = pgTable(
  'guest_imports',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    guestIdHash: text('guest_id_hash').notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer('version').notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    unique('guest_imports_owner_guest_unique').on(
      table.ownerUserId,
      table.guestIdHash,
    ),
    index('guest_imports_owner_user_id_idx').on(table.ownerUserId),
  ],
);

export type GuestImport = typeof guestImports.$inferSelect;
