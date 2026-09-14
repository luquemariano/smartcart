import { describe, expect, it } from 'vitest';
import {
  shouldCacheRequest,
  STATIC_CACHE_NAME,
} from '@/lib/service-worker-policy';
describe('service worker policy', () => {
  it('keeps versioned cache and never caches mutations or APIs', () => {
    expect(STATIC_CACHE_NAME).toBe('smartcart-static-v1');
    expect(shouldCacheRequest('POST', '/api/offline/sync')).toBe(false);
    expect(shouldCacheRequest('GET', '/api/products')).toBe(false);
    expect(shouldCacheRequest('GET', '/_next/static/app.js')).toBe(true);
    expect(shouldCacheRequest('GET', '/', 'navigate')).toBe(true);
    expect(shouldCacheRequest('PATCH', '/', 'navigate')).toBe(false);
  });
});
