/**
 * Base path for the admin app (whatever path the user added in urls.py, e.g. /admin or /djnext). From Django-injected __DJNEXT_BASE_PATH at load time.
 */

import { logBasePath } from '@/lib/debug';

/**
 * Returns the admin base path. Uses window.__DJNEXT_BASE_PATH when set (injected by Django), otherwise "" so dev at / or localhost:3001 works with pathname as the route.
 */
export function getBasePathFromPathname(): string {
  if (typeof window === 'undefined') {
    logBasePath('getBasePathFromPathname', '', 'ssr');
    return '';
  }
  const injected = (window as unknown as { __DJNEXT_BASE_PATH?: string }).__DJNEXT_BASE_PATH;
  if (injected !== undefined && injected !== null && String(injected).trim() !== '') {
    const s = String(injected).trim();
    const out = s.startsWith('/') ? s : '/' + s;
    logBasePath('getBasePathFromPathname', out, 'window.__DJNEXT_BASE_PATH');
    return out;
  }
  logBasePath('getBasePathFromPathname', '', 'no inject, use pathname as route');
  return '';
}
