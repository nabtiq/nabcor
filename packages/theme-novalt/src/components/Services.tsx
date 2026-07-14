import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

/** Services — supports grid-3up, grid-2up, and list recipes. */
export function Services({ section, locale }: SectionProps<'services'>) {
  const heading = localized(section.heading, locale);
  const isList = section.recipe === 'list';
  const gridClass = section.recipe === 'grid-2up' ? 'nv-grid nv-grid--2' : 'nv-grid nv-grid--3';

  return (
    <section className="nv-section">
      <div className="nv-container">
        {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-6)' }}>{heading}</h2>}

        {isList ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
            {section.items.map((s) => (
              <li key={s.slug} className="nv-card" style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', margin: 0 }}>{localized(s.title, locale)}</h3>
                <p className="nv-muted" style={{ margin: 0 }}>{localized(s.description, locale)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className={gridClass}>
            {section.items.map((s) => (
              <article key={s.slug} className="nv-card">
                <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 'var(--radius-sharp)', background: 'var(--color-brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-brand-600)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
                  {localized(s.title, locale).slice(0, 1)}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '21px', margin: '0 0 var(--space-2)' }}>{localized(s.title, locale)}</h3>
                <p className="nv-muted" style={{ margin: 0 }}>{localized(s.description, locale)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
