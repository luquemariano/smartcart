import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    brand: text('brand'),
    normalizedBrand: text('normalized_brand'),
    barcode: text('barcode'),
    normalizedBarcode: text('normalized_barcode'),
    quantityValue: numeric('quantity_value', { precision: 19, scale: 4 }),
    quantityUnit: text('quantity_unit'),
    duplicateKey: text('duplicate_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('products_owner_barcode_unique').on(
      table.ownerUserId,
      table.normalizedBarcode,
    ),
    unique('products_owner_duplicate_key_unique').on(
      table.ownerUserId,
      table.duplicateKey,
    ),
    index('products_owner_user_id_idx').on(table.ownerUserId),
    index('products_owner_name_idx').on(
      table.ownerUserId,
      table.normalizedName,
    ),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
