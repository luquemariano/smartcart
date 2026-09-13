import { z } from 'zod';
import { parseMoneyInput } from '@/lib/money';

const budgetValue = z
  .union([z.string(), z.null()])
  .superRefine((value, context) => {
    if (value !== null) {
      try {
        parseMoneyInput(value);
      } catch (error) {
        context.addIssue({
          code: 'custom',
          message:
            error instanceof Error
              ? error.message
              : 'El presupuesto no es válido.',
        });
      }
    }
  })
  .transform((value) => parseMoneyInput(value));

const optionalBudget = z.preprocess(
  (value) => (value === undefined ? null : value),
  budgetValue,
);

export const startShoppingSessionSchema = z
  .object({
    storeId: z.string().trim().min(1).optional().nullable(),
    budgetAmount: optionalBudget,
  })
  .strict()
  .transform((value) => ({
    storeId: value.storeId || null,
    budgetAmount: value.budgetAmount,
  }));

export const finishShoppingSessionSchema = z
  .object({ status: z.literal('completed') })
  .strict();

export const budgetShoppingSessionSchema = z
  .object({ budgetAmount: budgetValue })
  .strict();

export const shoppingSessionPatchSchema = z.union([
  finishShoppingSessionSchema,
  budgetShoppingSessionSchema,
]);

export type StartShoppingSessionInput = z.input<
  typeof startShoppingSessionSchema
>;
