import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const clientOperations = pgTable(
  'client_operations',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    operationId: text('operation_id').notNull(),
    operationType: text('operation_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    resultEntityId: text('result_entity_id'),
  },
  (table) => [
    unique('client_operations_owner_operation_unique').on(
      table.ownerUserId,
      table.operationId,
    ),
    index('client_operations_owner_idx').on(table.ownerUserId),
  ],
);

export type ClientOperation = typeof clientOperations.$inferSelect;
