import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

/** FAQ — native <details>/<summary> so it is keyboard-accessible with zero JS. */
export function Faq({ section, locale }: SectionProps<'faq'>) {
  const heading = localized(section.heading, locale);
  return (
    <section className="nv-section">
      <div className="nv-container" style={{ maxWidth: '760px' }}>
        {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-6)' }}>{heading}</h2>}
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {section.items.map((item, i) => (
            <details
              key={i}
              style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-soft)', padding: 'var(--space-3) var(--space-4)' }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '17px', listStyle: 'none' }}>
                {localized(item.q, locale)}
              </summary>
              <p className="nv-muted" style={{ marginBottom: 0 }}>{localized(item.a, locale)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
