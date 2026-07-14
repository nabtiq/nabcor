import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

/** Process — 4-stage vertical narrative with a connecting rail. */
export function Process({ section, locale }: SectionProps<'process'>) {
  const heading = localized(section.heading, locale);
  return (
    <section className="nv-section nv-section--muted">
      <div className="nv-container" style={{ maxWidth: '820px' }}>
        {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-6)' }}>{heading}</h2>}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-5)' }}>
          {section.stages.map((stage, i) => (
            <li key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>
              <div
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--color-on-brand)',
                  background: 'var(--color-brand-500)',
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-pill)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stage.step}
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', margin: '4px 0 var(--space-2)' }}>{localized(stage.title, locale)}</h3>
                <p className="nv-muted" style={{ margin: 0 }}>{localized(stage.body, locale)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
