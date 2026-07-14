import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

/**
 * Partners. `logo` is optional by design — real client intake often supplies
 * partner NAMES as text only (Josoor did). When no logos exist, this degrades
 * to a clean text-chip list rather than a broken image grid.
 */
export function Partners({ section, locale }: SectionProps<'partners'>) {
  const heading = localized(section.heading, locale);
  const anyLogos = section.partners.some((p) => !!p.logo);

  return (
    <section className="nv-section nv-section--muted">
      <div className="nv-container" style={{ textAlign: 'center' }}>
        {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-6)' }}>{heading}</h2>}

        {anyLogos ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', alignItems: 'center', justifyContent: 'center' }}>
            {section.partners.map((p, i) =>
              p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.logo} alt={localized(p.name, locale)} style={{ height: 40, width: 'auto', opacity: 0.8 }} />
              ) : (
                <span key={i} className="nv-muted" style={{ fontSize: '18px', fontWeight: 600 }}>{localized(p.name, locale)}</span>
              ),
            )}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'center' }}>
            {section.partners.map((p, i) => (
              <li
                key={i}
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border-strong)', fontWeight: 600, fontSize: '15px' }}
              >
                {localized(p.name, locale)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
