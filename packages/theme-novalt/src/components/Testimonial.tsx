import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

export function Testimonial({ section, locale }: SectionProps<'testimonial'>) {
  const heading = localized(section.heading, locale);
  return (
    <section className="nv-section">
      <div className="nv-container">
        {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>{heading}</h2>}
        <div className="nv-grid nv-grid--2">
          {section.quotes.map((q, i) => (
            <figure key={i} className="nv-card" style={{ margin: 0 }}>
              <blockquote style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '20px', lineHeight: 1.4 }}>
                “{localized(q.quote, locale)}”
              </blockquote>
              <figcaption style={{ marginTop: 'var(--space-4)', fontSize: '14px' }}>
                <strong>{localized(q.author, locale)}</strong>
                {q.role && <span className="nv-muted"> — {localized(q.role, locale)}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
