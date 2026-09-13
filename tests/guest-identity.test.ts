import { beforeEach, describe, expect, it } from 'vitest';
import {
  GUEST_IDENTITY_KEY,
  getGuestIdentity,
  resetGuestIdentity,
} from '@/lib/guest-identity';

describe('guest identity', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates a random local identity and reuses it', () => {
    const first = getGuestIdentity();
    const second = getGuestIdentity();

    expect(first).toBeTruthy();
    expect(first).toBe(second);
    expect(first).not.toContain('@');
    expect(window.localStorage.getItem(GUEST_IDENTITY_KEY)).toBe(first);
  });

  it('can explicitly reset the local identity', () => {
    getGuestIdentity();
    resetGuestIdentity();

    expect(window.localStorage.getItem(GUEST_IDENTITY_KEY)).toBeNull();
  });
});
