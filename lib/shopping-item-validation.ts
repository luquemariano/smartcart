import { z } from 'zod';
import {
  optionalProductBarcode,
  optionalProductQuantityValue,
  optionalProductText,
  quantityUnits,
} from '@/lib/product-validation';

const MAX_QUANTITY_SCALED = BigInt('999999999999');

function canonicalQuantity(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  const normalizedFraction = fraction.replace(/0+$/, '');
  return normalizedFraction
    ? `${normalizedWhole}.${normalizedFraction}`
    : normalizedWhole;
}

const quantityInput = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d{1,3})?$/, 'La cantidad no es válida.')
  .transform(canonicalQuantity)
  .refine((value) => value !== '0', 'La cantidad debe ser mayor a cero.')
  .refine((value) => {
    const [whole, fraction = ''] = value.split('.');
    return (
      BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, '0') || '0') <=
      MAX_QUANTITY_SCALED
    );
  }, 'La cantidad supera el límite permitido.');

const manualItemInputSchema = z
  .object({
    productId: z
      .null()
      .optional()
      .transform(() => null),
    productName: z
      .string()
      .trim()
      .min(1, 'El nombre del producto es obligatorio.')
      .max(160),
    brand: optionalProductText(120),
    barcode: optionalProductBarcode,
    quantityValue: optionalProductQuantityValue,
    quantityUnit: z
      .enum(quantityUnits)
      .optional()
      .nullable()
      .transform((value) => value ?? null),
    quantity: quantityInput,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.quantityValue !== null && value.quantityUnit === null) {
      context.addIssue({
        code: 'custom',
        path: ['quantityUnit'],
        message: 'Elegí una unidad para la presentación.',
      });
    }
    if (value.quantityValue === null && value.quantityUnit !== null) {
      context.addIssue({
        code: 'custom',
        path: ['quantityValue'],
        message: 'Ingresá una cantidad para la unidad elegida.',
      });
    }
  });

const catalogItemInputSchema = z
  .object({
    productId: z.string().trim().min(1, 'El producto es obligatorio.'),
    quantity: quantityInput,
  })
  .strict();

export const shoppingItemInputSchema = z.union([
  catalogItemInputSchema,
  manualItemInputSchema,
]);

export const shoppingItemQuantitySchema = z
  .object({ quantity: quantityInput })
  .strict();

export type ShoppingItemInput = z.output<typeof shoppingItemInputSchema>;
