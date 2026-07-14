/**
 * Four-column footer. Server component. Columns are supplied by the app so the
 * core stays content-agnostic; the business identity block is column one.
 */
import Link from 'next/link';
import type { BusinessInfo, Locale, LocalizedText } from '../schema/content';
import { localized } from '../util/localized';

export interface FooterColumn {
  heading: LocalizedText;
  links: { label: LocalizedText; href: string }[];
}

export function Footer({
  business,
  columns,
  locale,
  copyright,
}: {
  business: BusinessInfo;
  columns: FooterColumn[];
  locale: Locale;
  copyright?: LocalizedText;
}) {
  const year = 2026; // build-time constant; the demo is a static year to keep SSG deterministic
  return (
    <footer
      className="nabcor-footer"
      style={{
        marginTop: '96px',
        padding: 'clamp(40px, 6vw, 80px) clamp(16px, 5vw, 64px) 32px',
        background: 'var(--color-footer-bg, var(--color-ink, #111))',
        color: 'var(--color-footer-text, rgba(255,255,255,0.75))',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: '40px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-footer-strong, #fff)' }}>
            {localized(business.name, locale)}
          </strong>
          <p style={{ marginTop: '12px', fontSize: '14px', maxWidth: '28ch' }}>{localized(business.tagline, locale)}</p>
        </div>

        {columns.map((col, i) => (
          <div key={i}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', color: 'var(--color-footer-strong, #fff)' }}>
              {localized(col.heading, locale)}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href.startsWith('http') ? l.href : `/${locale}${l.href}`} style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}>
                    {localized(l.label, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: '1200px', margin: '40px auto 0', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: '13px' }}>
        © {year} {localized(business.name, locale)}
        {copyright ? ` — ${localized(copyright, locale)}` : ''}
      </div>
    </footer>
  );
}
