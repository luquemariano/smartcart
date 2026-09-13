import { z } from 'zod';
import { parseMoneyInput } from '@/lib/money';

const money = z.string().superRefine((value, ctx) => {
  try {
    parseMoneyInput(value);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Importe inválido.' });
  }
});
export const promotionInputSchema = z
  .object({
    storeId: z.string().min(1),
    productId: z.string().min(1),
    type: z.enum(['percentage', 'fixed_price', 'buy_n_pay_m']),
    value: z.string().nullable().optional(),
    buyQuantity: z.number().int().nullable().optional(),
    payQuantity: z.number().int().nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.startsAt >= v.endsAt)
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'La vigencia es inválida.',
      });
    if (v.type === 'percentage') {
      if (!v.value || Number(v.value) <= 0 || Number(v.value) > 100)
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'El porcentaje debe estar entre 0 y 100.',
        });
    }
    if (v.type === 'fixed_price') {
      if (!v.value)
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'El precio fijo es obligatorio.',
        });
      else money.parse(v.value);
    }
    if (
      v.type === 'buy_n_pay_m' &&
      (!(v.buyQuantity && v.buyQuantity >= 2) ||
        !(v.payQuantity && v.payQuantity >= 1 && v.payQuantity < v.buyQuantity))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'La promoción N x M no es válida.',
      });
  });
export type PromotionInput = z.infer<typeof promotionInputSchema>;
