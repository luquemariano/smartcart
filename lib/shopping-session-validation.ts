import { z } from 'zod';

export const startShoppingSessionSchema = z
  .object({
    storeId: z.string().trim().min(1).optional().nullable(),
  })
  .strict()
  .transform((value) => ({ storeId: value.storeId || null }));

export const finishShoppingSessionSchema = z
  .object({ status: z.literal('completed') })
  .strict();

export type StartShoppingSessionInput = z.input<
  typeof startShoppingSessionSchema
>;
