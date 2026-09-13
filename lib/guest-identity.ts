export const GUEST_IDENTITY_KEY = 'smartcart.guest.identity';

function createGuestId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function getGuestIdentity(): string | null {
  if (typeof window === 'undefined') return null;

  const existing = window.localStorage.getItem(GUEST_IDENTITY_KEY);
  if (existing) return existing;

  const identity = createGuestId();
  window.localStorage.setItem(GUEST_IDENTITY_KEY, identity);
  return identity;
}

export function resetGuestIdentity(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(GUEST_IDENTITY_KEY);
  }
}
