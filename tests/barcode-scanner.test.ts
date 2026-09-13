import { describe, expect, it } from 'vitest';
import {
  normalizeDetectedBarcode,
  scanBarcodeFrame,
  selectDetectedBarcode,
} from '@/lib/barcode-scanner';
import {
  DEFAULT_SCANNED_QUANTITY,
  findProductByBarcode,
} from '@/lib/barcode-product-flow';

describe('barcode scanner flow', () => {
  it('preserves leading zeros and accepts only 8-14 digits', () => {
    expect(normalizeDetectedBarcode('  00123456 ')).toBe('00123456');
    expect(normalizeDetectedBarcode('1234567')).toBeNull();
    expect(normalizeDetectedBarcode('123456789012345')).toBeNull();
    expect(normalizeDetectedBarcode('1234ABCD')).toBeNull();
  });

  it('selects the first valid native detection', () => {
    expect(
      selectDetectedBarcode([
        { rawValue: 'not-code' },
        { rawValue: '77912345' },
      ]),
    ).toBe('77912345');
  });

  it('uses the detector without converting the barcode to a number', async () => {
    const detector = { detect: async () => [{ rawValue: '00001234' }] };
    await expect(scanBarcodeFrame(detector, {})).resolves.toBe('00001234');
  });

  it('finds catalog products by exact barcode and defaults quantity to one', () => {
    const products = [
      { id: 'a', barcode: '00123456' },
      { id: 'b', barcode: '77912345' },
    ];
    expect(findProductByBarcode(products, '00123456')?.id).toBe('a');
    expect(findProductByBarcode(products, '0012345')).toBeUndefined();
    expect(DEFAULT_SCANNED_QUANTITY).toBe('1');
  });
});
