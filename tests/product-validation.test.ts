import { describe, expect, it } from 'vitest';
import {
  areComparableUnits,
  normalizeMass,
  normalizeQuantity,
  normalizeVolume,
  productInputSchema,
} from '@/lib/product-validation';

describe('product validation and quantity normalization', () => {
  it('validates manual products, barcodes and structured quantities', () => {
    expect(
      productInputSchema.parse({
        name: '  Yerba   Playadito ',
        brand: '  Playadito ',
        barcode: '00012345678905',
        quantityValue: '1.5000',
        quantityUnit: 'kg',
      }),
    ).toMatchObject({
      name: 'Yerba   Playadito',
      barcode: '00012345678905',
      quantityValue: '1.5',
      quantityUnit: 'kg',
    });
    expect(() =>
      productInputSchema.parse({ name: 'X', barcode: '123' }),
    ).toThrow();
    expect(() =>
      productInputSchema.parse({
        name: '',
        quantityValue: '1',
        quantityUnit: 'kg',
      }),
    ).toThrow();
    expect(() =>
      productInputSchema.parse({ name: 'X', quantityValue: '1' }),
    ).toThrow();
  });

  it('normalizes compatible units with exact decimal arithmetic', () => {
    expect(normalizeMass('1.5', 'kg')).toMatchObject({
      value: '1500',
      unit: 'g',
    });
    expect(normalizeMass('500', 'g')).toMatchObject({
      value: '500',
      unit: 'g',
    });
    expect(normalizeVolume('1', 'l')).toMatchObject({
      value: '1000',
      unit: 'ml',
    });
    expect(normalizeVolume('750', 'ml')).toMatchObject({
      value: '750',
      unit: 'ml',
    });
    expect(normalizeQuantity('12', 'unit')).toMatchObject({
      value: '12',
      unit: 'unit',
    });
    expect(areComparableUnits('kg', 'g')).toBe(true);
    expect(areComparableUnits('kg', 'l')).toBe(false);
    expect(() => normalizeMass('1', 'l')).toThrow('INCOMPATIBLE_UNIT');
  });
});
