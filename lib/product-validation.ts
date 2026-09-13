import { z } from 'zod';

export const quantityUnits = ['g', 'kg', 'ml', 'l', 'unit'] as const;
export type QuantityUnit = (typeof quantityUnits)[number];

export const quantityUnitLabels: Record<QuantityUnit, string> = {
  g: 'gramos',
  kg: 'kilogramos',
  ml: 'mililitros',
  l: 'litros',
  unit: 'unidades',
};

export const optionalProductText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const optionalProductBarcode = z
  .string()
  .trim()
  .max(14)
  .optional()
  .nullable()
  .transform((value) => value || null)
  .refine(
    (value) => value === null || /^\d{8,14}$/.test(value),
    'El código de barras debe tener entre 8 y 14 dígitos.',
  );

function canonicalDecimal(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  const normalizedFraction = fraction.replace(/0+$/, '');
  return normalizedFraction
    ? `${normalizedWhole}.${normalizedFraction}`
    : normalizedWhole;
}

export const optionalProductQuantityValue = z
  .preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'number')
        return Number.isFinite(value) ? String(value) : value;
      return typeof value === 'string' ? value.trim() : value;
    },
    z
      .string()
      .regex(/^\d{1,15}(?:\.\d{1,4})?$/, 'La cantidad no es válida.')
      .nullable(),
  )
  .transform((value) => (value === null ? null : canonicalDecimal(value)))
  .refine(
    (value) => value === null || value !== '0',
    'La cantidad debe ser mayor a cero.',
  );

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio.').max(160),
    brand: optionalProductText(120),
    barcode: optionalProductBarcode,
    quantityValue: optionalProductQuantityValue,
    quantityUnit: z
      .enum(quantityUnits)
      .optional()
      .nullable()
      .transform((value) => value ?? null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.quantityValue !== null && value.quantityUnit === null) {
      context.addIssue({
        code: 'custom',
        path: ['quantityUnit'],
        message: 'Elegí una unidad para la cantidad.',
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

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductData = z.output<typeof productInputSchema>;

export function normalizeProductPart(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR') || null;
}

export function normalizeBarcode(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return value.trim() || null;
}

export function productDuplicateKey(input: ProductData): string {
  return [
    normalizeProductPart(input.name) ?? '',
    normalizeProductPart(input.brand) ?? '',
    input.quantityValue ?? '',
    input.quantityUnit ?? '',
  ]
    .map((part) => `${part.length}:${part}`)
    .join('|');
}

function decimalToScaled(value: string, scale: number): bigint {
  const [whole, fraction = ''] = value.split('.');
  return (
    BigInt(whole) * BigInt(10) ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, '0') || '0')
  );
}

function scaledToDecimal(value: bigint, scale: number): string {
  const unit = BigInt(10) ** BigInt(scale);
  const whole = value / unit;
  const fraction = (value % unit)
    .toString()
    .padStart(scale, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export type NormalizedQuantity = {
  category: 'mass' | 'volume' | 'count';
  value: string;
  unit: 'g' | 'ml' | 'unit';
};

export function normalizeMass(
  value: string,
  unit: QuantityUnit,
): NormalizedQuantity {
  if (unit !== 'g' && unit !== 'kg') throw new Error('INCOMPATIBLE_UNIT');
  const scaled =
    decimalToScaled(value, 4) * (unit === 'kg' ? BigInt(1000) : BigInt(1));
  return { category: 'mass', value: scaledToDecimal(scaled, 4), unit: 'g' };
}

export function normalizeVolume(
  value: string,
  unit: QuantityUnit,
): NormalizedQuantity {
  if (unit !== 'ml' && unit !== 'l') throw new Error('INCOMPATIBLE_UNIT');
  const scaled =
    decimalToScaled(value, 4) * (unit === 'l' ? BigInt(1000) : BigInt(1));
  return { category: 'volume', value: scaledToDecimal(scaled, 4), unit: 'ml' };
}

export function normalizeQuantity(
  value: string,
  unit: QuantityUnit,
): NormalizedQuantity {
  if (unit === 'g' || unit === 'kg') return normalizeMass(value, unit);
  if (unit === 'ml' || unit === 'l') return normalizeVolume(value, unit);
  if (unit === 'unit')
    return { category: 'count', value: canonicalDecimal(value), unit };
  throw new Error('INCOMPATIBLE_UNIT');
}

export function areComparableUnits(
  left: QuantityUnit,
  right: QuantityUnit,
): boolean {
  return (
    (left === 'unit' && right === 'unit') ||
    (['g', 'kg'].includes(left) && ['g', 'kg'].includes(right)) ||
    (['ml', 'l'].includes(left) && ['ml', 'l'].includes(right))
  );
}
