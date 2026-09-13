import { z } from 'zod';
import {
  shoppingItemInputSchema,
  shoppingItemQuantitySchema,
} from './shopping-item-validation';
export const shoppingListNameSchema = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(120, 'El nombre es demasiado largo.');
export const shoppingListNameInputSchema = z
  .object({ name: shoppingListNameSchema })
  .strict();
export type ShoppingListItemInput = {
  productId: string | null;
  quantity: string;
  productName?: string;
  brand?: string | null;
  barcode?: string | null;
  quantityValue?: string | null;
  quantityUnit?: 'g' | 'kg' | 'ml' | 'l' | 'unit' | null;
};
export const shoppingListItemInputSchema = shoppingItemInputSchema.transform(
  (value) => {
    const { unitPrice: ignored, ...item } = value;
    void ignored;
    return item as ShoppingListItemInput;
  },
);
export const shoppingListItemPatchSchema = z
  .object({
    quantity: z.string().optional(),
    isChecked: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) => v.quantity !== undefined || v.isChecked !== undefined,
    'Indicá un cambio.',
  );
export { shoppingItemQuantitySchema };
