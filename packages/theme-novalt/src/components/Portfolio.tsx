import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

/** Portfolio — client projects. Degrades gracefully when a project has no image. */
export function Portfolio({ section, locale }: SectionProps<'portfolio'>) {
  const heading = localized(section.heading, locale);
  return (
    <section className="nv-section">
      <div className="nv-container">
        {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-6)' }}>{heading}</h2>}
        <div className="nv-grid nv-grid--3">
          {section.projects.map((p, i) => (
            <article key={i} className="nv-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16 / 10', background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={localized(p.client, locale)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--color-brand-600)' }}>
                    {localized(p.client, locale).slice(0, 2)}
                  </span>
                )}
              </div>
              <div style={{ padding: 'var(--space-4)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '19px', margin: '0 0 var(--space-1)' }}>{localized(p.client, locale)}</h3>
                <p className="nv-muted" style={{ margin: 0, fontSize: '14px' }}>{localized(p.description, locale)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
