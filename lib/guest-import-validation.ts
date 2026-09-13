import { z } from 'zod';
import { quantityUnits } from '@/lib/product-validation';

const nullableString = z.string().nullable();
const dateString = z.string().datetime({ offset: true });
const quantity = z.string().regex(/^\d{1,9}(?:\.\d{1,3})?$/);

const store = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    branchName: nullableString,
    address: nullableString,
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    createdAt: dateString,
    updatedAt: dateString,
  })
  .strict();
const product = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(160),
    brand: nullableString,
    barcode: nullableString,
    quantityValue: nullableString,
    quantityUnit: z.enum(quantityUnits).nullable(),
    createdAt: dateString,
    updatedAt: dateString,
  })
  .strict();
const item = z
  .object({
    id: z.string().min(1),
    shoppingSessionId: z.string().min(1),
    productId: z.string().nullable(),
    productName: z.string().min(1).max(160),
    productBrand: nullableString,
    productBarcode: nullableString,
    productQuantityValue: nullableString,
    productQuantityUnit: z.enum(quantityUnits).nullable(),
    quantity,
    unitPrice: z.string().nullable(),
    createdAt: dateString,
    updatedAt: dateString,
  })
  .strict();
const session = z
  .object({
    id: z.string().min(1),
    storeId: z.string().nullable(),
    status: z.enum(['active', 'completed']),
    budgetAmount: z.string().nullable(),
    currency: z.string().length(3),
    startedAt: dateString,
    finishedAt: dateString.nullable(),
    createdAt: dateString,
    updatedAt: dateString,
    items: z.array(item),
  })
  .strict();
const listItem = z
  .object({
    id: z.string().min(1),
    shoppingListId: z.string().min(1),
    productId: z.string().nullable(),
    productName: z.string().min(1).max(160),
    productBrand: nullableString,
    productBarcode: nullableString,
    productQuantityValue: nullableString,
    productQuantityUnit: z.enum(quantityUnits).nullable(),
    quantity,
    isChecked: z.boolean(),
    createdAt: dateString,
    updatedAt: dateString,
  })
  .strict();
const list = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    createdAt: dateString,
    updatedAt: dateString,
    items: z.array(listItem),
  })
  .strict();
const promotion = z
  .object({
    id: z.string().min(1),
    guestId: z.string().uuid(),
    productId: z.string().min(1),
    storeId: z.string().min(1),
    type: z.enum(['percentage', 'fixed_price', 'buy_n_pay_m']),
    value: z.string().nullable(),
    buyQuantity: z.number().int().nullable(),
    payQuantity: z.number().int().nullable(),
    startsAt: dateString,
    endsAt: dateString,
    isActive: z.boolean(),
    createdAt: dateString,
    updatedAt: dateString,
  })
  .strict();

export const guestImportSnapshotSchema = z
  .object({
    guestId: z.string().uuid(),
    version: z.literal(1),
    stores: z.array(store),
    products: z.array(product),
    sessions: z.array(session),
    lists: z.array(list),
    promotions: z.array(promotion).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sessions.filter((entry) => entry.status === 'active').length > 1)
      context.addIssue({
        code: 'custom',
        path: ['sessions'],
        message: 'Solo puede existir una sesión guest activa.',
      });
  });
export type GuestImportSnapshot = z.infer<typeof guestImportSnapshotSchema>;
