'use client';
/**
 * Locale switcher. Decoupled from any i18n library: it swaps the leading
 * `/{locale}` path segment, which is correct for a routing setup that always
 * prefixes the locale (the nabcor default — fixes the audited flash-of-wrong-
 * direction by keeping direction a server concern of the URL, not a client
 * effect).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '../schema/content';

export function LocaleSwitcher({
  locale,
  locales,
  localeNames,
}: {
  locale: Locale;
  locales: Locale[];
  localeNames: Record<string, string>;
}) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/[^/]+/, ''); // strip current locale segment

  return (
    <nav aria-label="Language" className="nabcor-locale-switch" style={{ display: 'inline-flex', gap: '8px' }}>
      {locales.map((l) => {
        const href = `/${l}${rest}`;
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            hrefLang={l}
            aria-current={active ? 'true' : undefined}
            style={{
              fontWeight: active ? 700 : 400,
              opacity: active ? 1 : 0.7,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {localeNames[l] ?? l}
          </Link>
        );
      })}
    </nav>
  );
}
