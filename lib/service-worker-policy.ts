export const STATIC_CACHE_NAME = 'smartcart-static-v1';
export function shouldCacheRequest(
  method: string,
  pathname: string,
  mode?: string,
) {
  if (method !== 'GET') return false;
  if (pathname.startsWith('/api/')) return false;
  return (
    mode === 'navigate' ||
    pathname.startsWith('/_next/static/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/icon.svg'
  );
}
