import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalProduct,
  listLocalProducts,
} from '@/lib/local-product-repository';
import { createLocalShoppingList } from '@/lib/local-shopping-list-repository';
import { getGuestIdentity } from '@/lib/guest-identity';
import { buildGuestImportSnapshot, importGuestData } from '@/lib/guest-import';
import { guestImportSnapshotSchema } from '@/lib/guest-import-validation';

describe('guest import coordinator', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('builds a complete snapshot and rejects client ownership authority', () => {
    const guestId = getGuestIdentity()!;
    createLocalProduct(guestId, {
      name: 'Leche',
      brand: null,
      barcode: null,
      quantityValue: null,
      quantityUnit: null,
    });
    createLocalShoppingList(guestId, 'Compra');
    const snapshot = buildGuestImportSnapshot(guestId);
    expect(snapshot.guestId).toBe(guestId);
    expect(snapshot.products).toHaveLength(1);
    expect(snapshot.lists).toHaveLength(1);
    expect(() =>
      guestImportSnapshotSchema.parse({ ...snapshot, ownerUserId: 'evil' }),
    ).toThrow();
  });

  it('keeps guest data after an API failure and cleans it only after success', async () => {
    const guestId = getGuestIdentity()!;
    createLocalProduct(guestId, {
      name: 'Pan',
      brand: null,
      barcode: null,
      quantityValue: null,
      quantityUnit: null,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'falló' }), { status: 500 }),
    );
    await expect(importGuestData()).rejects.toThrow('falló');
    expect(listLocalProducts(guestId)).toHaveLength(1);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ importStatus: 'imported' }), {
        status: 200,
      }),
    );
    await importGuestData();
    expect(listLocalProducts(guestId)).toHaveLength(0);
    expect(window.localStorage.getItem('smartcart.guest.identity')).toBeNull();
  });
});
