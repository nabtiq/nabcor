import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

export function Stats({ section, locale }: SectionProps<'stats'>) {
  const heading = localized(section.heading, locale);
  return (
    <section className="nv-section nv-section--muted">
      <div className="nv-container">
        {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>{heading}</h2>}
        <div className="nv-grid nv-grid--3" style={{ textAlign: 'center' }}>
          {section.items.map((item, i) => (
            <div key={i}>
              <div className="nv-stat-value">{localized(item.value, locale)}</div>
              <p className="nv-muted" style={{ marginTop: 'var(--space-2)', fontSize: '15px' }}>{localized(item.label, locale)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
