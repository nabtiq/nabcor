/**
 * Security headers preset — ported from the josouralazl/nabtiq block the audit
 * found copy-pasted three times. One source now, with a per-site allowlist hook
 * so a site that needs (say) Plausible or Supabase can extend the CSP without
 * re-deriving the whole policy.
 *
 * CSP note: 'unsafe-inline' on script-src is required by the Next.js App Router
 * (inline hydration scripts). Tighten to a nonce-based middleware policy later.
 */
export interface SecurityHeaderOptions {
  scriptSrc?: string[];
  connectSrc?: string[];
  imgSrc?: string[];
  styleSrc?: string[];
  frameSrc?: string[];
}

export function buildCsp(opts: SecurityHeaderOptions = {}): string {
  const dirs: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(opts.scriptSrc ?? [])],
    'style-src': ["'self'", "'unsafe-inline'", ...(opts.styleSrc ?? [])],
    'img-src': ["'self'", 'data:', 'blob:', ...(opts.imgSrc ?? [])],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(opts.connectSrc ?? [])],
    'frame-src': opts.frameSrc ?? ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };
  const body = Object.entries(dirs)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
  return `${body}; upgrade-insecure-requests`;
}

export function securityHeaders(opts: SecurityHeaderOptions = {}): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(opts) },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  ];
}

/**
 * Merge the security headers into a Next config's `headers()`. Preserves any
 * existing header rules the app already defines.
 */
export function withSecurityHeaders<T extends { headers?: () => Promise<unknown> }>(
  nextConfig: T,
  opts: SecurityHeaderOptions = {},
): T {
  const headers = securityHeaders(opts);
  return {
    ...nextConfig,
    async headers() {
      const existing = (await nextConfig.headers?.()) as unknown[] | undefined;
      return [...(existing ?? []), { source: '/(.*)', headers }];
    },
  };
}
