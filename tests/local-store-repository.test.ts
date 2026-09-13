import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalStore,
  deleteLocalStore,
  listLocalStores,
  updateLocalStore,
} from '@/lib/local-store-repository';

const input = {
  name: 'Carrefour',
  branchName: 'Colón',
  address: '',
  latitude: null,
  longitude: null,
};

describe('local store repository', () => {
  beforeEach(() => window.localStorage.clear());

  it('supports create, list, update and delete per guest', () => {
    const store = createLocalStore('guest-a', input);
    expect(listLocalStores('guest-a')).toHaveLength(1);

    updateLocalStore('guest-a', store.id, {
      ...input,
      name: 'Carrefour Express',
    });
    expect(listLocalStores('guest-a')[0].name).toBe('Carrefour Express');

    deleteLocalStore('guest-a', store.id);
    expect(listLocalStores('guest-a')).toHaveLength(0);
  });

  it('keeps stores isolated by guest id and rejects normalized duplicates', () => {
    createLocalStore('guest-a', input);
    expect(listLocalStores('guest-b')).toHaveLength(0);
    expect(() =>
      createLocalStore('guest-a', { ...input, name: '  carrefour  ' }),
    ).toThrow('DUPLICATE_STORE');
  });
});
