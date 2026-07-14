/**
 * Site header with primary nav and locale switcher. Server component — it
 * receives already-localized-safe data and renders links; only the switcher is
 * a client island. Token-driven: no hardcoded theme colors.
 */
import Link from 'next/link';
import type { BusinessInfo, Locale, LocalizedText } from '../schema/content';
import { localized } from '../util/localized';
import { LocaleSwitcher } from './LocaleSwitcher';

export interface NavLink {
  label: LocalizedText;
  href: string;
}

export function Header({
  business,
  nav,
  locale,
  locales,
  localeNames,
}: {
  business: BusinessInfo;
  nav: NavLink[];
  locale: Locale;
  locales: Locale[];
  localeNames: Record<string, string>;
}) {
  const home = `/${locale}`;
  return (
    <header
      className="nabcor-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '16px clamp(16px, 5vw, 64px)',
        background: 'var(--color-surface-1, rgba(255,255,255,0.85))',
        backdropFilter: 'saturate(150%) blur(8px)',
        borderBottom: '1px solid var(--color-border, rgba(0,0,0,0.08))',
      }}
    >
      <Link
        href={home}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}
      >
        {business.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logo} alt={localized(business.name, locale)} height={28} style={{ height: 28, width: 'auto' }} />
        ) : (
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>{localized(business.name, locale)}</strong>
        )}
      </Link>

      <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 28px)' }}>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={`/${locale}${item.href}`}
            style={{ textDecoration: 'none', color: 'var(--color-text-secondary, inherit)', fontSize: '15px' }}
          >
            {localized(item.label, locale)}
          </Link>
        ))}
      </nav>

      <LocaleSwitcher locale={locale} locales={locales} localeNames={localeNames} />
    </header>
  );
}
