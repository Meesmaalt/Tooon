/** Public URL helpers — root or reverse-proxy subpath without hardcoding host/domain */

export function getPublicBase(): string {
  const viteBase = (import.meta as any).env?.BASE_URL || '/';
  if (viteBase === './' || viteBase === '.') {
    let p = window.location.pathname;
    if (!p.endsWith('/')) {
      const i = p.lastIndexOf('/');
      p = i >= 0 ? p.slice(0, i + 1) : '/';
    }
    return p || '/';
  }
  return viteBase.endsWith('/') ? viteBase : viteBase + '/';
}

export function apiUrl(path: string): string {
  const base = getPublicBase();
  const clean = path.replace(/^\//, '');
  return `${base}${clean}`.replace(/([^:]\/)\/+/g, '$1');
}

export function wsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = getPublicBase().replace(/\/$/, '');
  return `${protocol}//${window.location.host}${base || ''}`;
}
