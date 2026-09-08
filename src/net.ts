/**
 * Runtime public base from the browser URL.
 * Works at / and under any reverse-proxy subpath (e.g. /ralli/) without env/hardcoding.
 */
export function getPublicBase(): string {
  let p = window.location.pathname || '/';
  // If path looks like a file (has extension), use its directory
  if (/\.[a-zA-Z0-9]+$/.test(p)) {
    p = p.slice(0, p.lastIndexOf('/') + 1);
  } else if (!p.endsWith('/')) {
    p = p + '/';
  }
  return p || '/';
}

export function apiUrl(path: string): string {
  const base = getPublicBase();
  const clean = path.replace(/^\//, '');
  return `${base}${clean}`.replace(/([^:]\/)\/+/g, '$1');
}

export function wsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Same origin path as the page (directory), so proxies under /ralli/ still match
  const base = getPublicBase().replace(/\/$/, '');
  return `${protocol}//${window.location.host}${base || ''}`;
}
