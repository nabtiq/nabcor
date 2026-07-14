/**
 * Core default section components — the theme fallback layer.
 *
 * A theme now declares `components: Partial<SectionComponents>`. For any section
 * type it does NOT override, `resolveSection` falls back to the neutral default
 * below. This makes token-only and partial themes possible: a theme can ship
 * just a `tokens.css` (and `components: {}`) and still render every section.
 *
 * Rules for these defaults (intentionally generic):
 *  - No brand identity, no fixed colors — SEMANTIC tokens only, each with a
 *    safe fallback so they render even with no theme at all.
 *  - RTL/LTR safe (logical properties), accessible, mobile-responsive.
 */
import type { CSSProperties } from 'react';
import type { SectionComponent, SectionComponents } from '../contracts/theme';
import type { Locale, Section, SectionType } from '../schema/content';
import { localized } from '../util/localized';

/* ── shared neutral styles (semantic tokens + fallbacks) ─────────────── */
const S = {
  section: {
    paddingBlock: 'var(--space-7, 64px)',
    paddingInline: 'var(--nc-gutter, clamp(16px, 5vw, 56px))',
  } as CSSProperties,
  sectionMuted: { background: 'var(--color-surface-2, #f4f4f6)' } as CSSProperties,
  container: { maxWidth: 'var(--nc-maxw, 1120px)', marginInline: 'auto' } as CSSProperties,
  h1: {
    fontFamily: 'var(--font-display, var(--font-sans, system-ui, sans-serif))',
    fontSize: 'clamp(34px, 6vw, 60px)',
    lineHeight: 1.06,
    fontWeight: 600,
    margin: 0,
    color: 'var(--color-text-primary, #17171a)',
  } as CSSProperties,
  h2: {
    fontFamily: 'var(--font-display, var(--font-sans, system-ui, sans-serif))',
    fontSize: 'clamp(24px, 4vw, 40px)',
    lineHeight: 1.15,
    fontWeight: 600,
    margin: '0 0 var(--space-5, 32px)',
    color: 'var(--color-text-primary, #17171a)',
  } as CSSProperties,
  h3: {
    fontFamily: 'var(--font-display, var(--font-sans, system-ui, sans-serif))',
    fontSize: '20px',
    margin: '0 0 var(--space-2, 8px)',
    color: 'var(--color-text-primary, #17171a)',
  } as CSSProperties,
  eyebrow: {
    display: 'inline-block',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-brand-500, #444)',
    marginBottom: 'var(--space-3, 16px)',
  } as CSSProperties,
  lead: {
    fontSize: 'clamp(16px, 2vw, 19px)',
    lineHeight: 1.6,
    color: 'var(--color-text-secondary, #444)',
    maxWidth: '62ch',
    margin: 0,
  } as CSSProperties,
  muted: { color: 'var(--color-text-muted, #605a6e)', margin: 0 } as CSSProperties,
  card: {
    background: 'var(--color-surface-1, #fff)',
    border: '1px solid var(--color-border, rgba(0,0,0,0.12))',
    borderRadius: 'var(--radius-soft, 12px)',
    padding: 'var(--space-5, 28px)',
  } as CSSProperties,
  grid3: {
    display: 'grid',
    gap: 'var(--space-4, 24px)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  } as CSSProperties,
  grid2: {
    display: 'grid',
    gap: 'var(--space-4, 24px)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  } as CSSProperties,
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    fontWeight: 700,
    borderRadius: 'var(--radius-pill, 999px)',
    background: 'var(--color-brand-500, #333)',
    color: 'var(--color-on-brand, #fff)',
    textDecoration: 'none',
    border: '1px solid transparent',
  } as CSSProperties,
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    fontWeight: 700,
    borderRadius: 'var(--radius-pill, 999px)',
    background: 'transparent',
    color: 'var(--color-brand-500, #333)',
    textDecoration: 'none',
    border: '1px solid var(--color-border, rgba(0,0,0,0.25))',
  } as CSSProperties,
} as const;

/* ── the nine defaults ───────────────────────────────────────────────── */

const Hero: SectionComponent<'hero'> = ({ section, locale }) => {
  const eyebrow = localized(section.eyebrow, locale);
  const text = (
    <div>
      {eyebrow && <span style={S.eyebrow}>{eyebrow}</span>}
      <h1 style={S.h1}>{localized(section.headline, locale)}</h1>
      {section.subheadline && (
        <p style={{ ...S.lead, marginTop: 'var(--space-4, 24px)' }}>{localized(section.subheadline, locale)}</p>
      )}
      {(section.cta || section.secondaryCta) && (
        <div style={{ display: 'flex', gap: 'var(--space-3, 16px)', flexWrap: 'wrap', marginTop: 'var(--space-5, 32px)' }}>
          {section.cta && (
            <a style={S.btnPrimary} href={section.cta.href}>
              {localized(section.cta.label, locale)}
            </a>
          )}
          {section.secondaryCta && (
            <a style={S.btnGhost} href={section.secondaryCta.href}>
              {localized(section.secondaryCta.label, locale)}
            </a>
          )}
        </div>
      )}
    </div>
  );

  const image = section.media ? (
    <div style={{ borderRadius: 'var(--radius-soft, 12px)', overflow: 'hidden', aspectRatio: '4 / 3', background: 'var(--color-surface-3, #ececf0)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={section.media.src} alt={localized(section.media.alt, locale)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  ) : null;

  if (section.recipe === 'centered-text' || !section.media) {
    return (
      <section style={{ ...S.section, ...S.sectionMuted }}>
        <div style={{ ...S.container, maxWidth: 820, textAlign: 'center', display: 'grid', justifyItems: 'center' }}>{text}</div>
      </section>
    );
  }

  const imageFirst = section.recipe === 'split-image-left';
  return (
    <section style={S.section}>
      <div style={{ ...S.container, display: 'grid', gap: 'var(--space-7, 56px)', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>
        {imageFirst ? (
          <>
            {image}
            {text}
          </>
        ) : (
          <>
            {text}
            {image}
          </>
        )}
      </div>
    </section>
  );
};

const Stats: SectionComponent<'stats'> = ({ section, locale }) => (
  <section style={{ ...S.section, ...S.sectionMuted }}>
    <div style={S.container}>
      {section.heading && <h2 style={{ ...S.h2, textAlign: 'center' }}>{localized(section.heading, locale)}</h2>}
      <div style={{ ...S.grid3, textAlign: 'center' }}>
        {section.items.map((item, i) => (
          <div key={i}>
            <div style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, color: 'var(--color-brand-500, #333)', lineHeight: 1 }}>
              {localized(item.value, locale)}
            </div>
            <p style={{ ...S.muted, marginTop: 'var(--space-2, 8px)', fontSize: 15 }}>{localized(item.label, locale)}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Services: SectionComponent<'services'> = ({ section, locale }) => {
  const isList = section.recipe === 'list';
  const grid = section.recipe === 'grid-2up' ? S.grid2 : S.grid3;
  return (
    <section style={S.section}>
      <div style={S.container}>
        {section.heading && <h2 style={S.h2}>{localized(section.heading, locale)}</h2>}
        {isList ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3, 16px)' }}>
            {section.items.map((s) => (
              <li key={s.slug} style={{ ...S.card, display: 'grid', gap: 'var(--space-2, 8px)' }}>
                <h3 style={S.h3}>{localized(s.title, locale)}</h3>
                <p style={S.muted}>{localized(s.description, locale)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div style={grid}>
            {section.items.map((s) => (
              <article key={s.slug} style={S.card}>
                <h3 style={S.h3}>{localized(s.title, locale)}</h3>
                <p style={S.muted}>{localized(s.description, locale)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const Process: SectionComponent<'process'> = ({ section, locale }) => (
  <section style={{ ...S.section, ...S.sectionMuted }}>
    <div style={{ ...S.container, maxWidth: 820 }}>
      {section.heading && <h2 style={S.h2}>{localized(section.heading, locale)}</h2>}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-5, 32px)' }}>
        {section.stages.map((stage, i) => (
          <li key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-4, 24px)', alignItems: 'start' }}>
            <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill, 999px)', background: 'var(--color-brand-500, #333)', color: 'var(--color-on-brand, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {stage.step}
            </div>
            <div>
              <h3 style={S.h3}>{localized(stage.title, locale)}</h3>
              <p style={S.muted}>{localized(stage.body, locale)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const Portfolio: SectionComponent<'portfolio'> = ({ section, locale }) => (
  <section style={S.section}>
    <div style={S.container}>
      {section.heading && <h2 style={S.h2}>{localized(section.heading, locale)}</h2>}
      <div style={S.grid3}>
        {section.projects.map((p, i) => (
          <article key={i} style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '16 / 10', background: 'var(--color-surface-3, #ececf0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={localized(p.client, locale)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 26, color: 'var(--color-text-secondary, #444)' }}>{localized(p.client, locale).slice(0, 2)}</span>
              )}
            </div>
            <div style={{ padding: 'var(--space-4, 24px)' }}>
              <h3 style={{ ...S.h3, fontSize: 18 }}>{localized(p.client, locale)}</h3>
              <p style={{ ...S.muted, fontSize: 14 }}>{localized(p.description, locale)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Partners: SectionComponent<'partners'> = ({ section, locale }) => {
  const anyLogos = section.partners.some((p) => !!p.logo);
  return (
    <section style={{ ...S.section, ...S.sectionMuted }}>
      <div style={{ ...S.container, textAlign: 'center' }}>
        {section.heading && <h2 style={S.h2}>{localized(section.heading, locale)}</h2>}
        {anyLogos ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6, 40px)', alignItems: 'center', justifyContent: 'center' }}>
            {section.partners.map((p, i) =>
              p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.logo} alt={localized(p.name, locale)} style={{ height: 36, width: 'auto', opacity: 0.85 }} />
              ) : (
                <span key={i} style={{ ...S.muted, fontSize: 17, fontWeight: 600 }}>{localized(p.name, locale)}</span>
              ),
            )}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3, 16px)', justifyContent: 'center' }}>
            {section.partners.map((p, i) => (
              <li key={i} style={{ padding: '10px 18px', borderRadius: 'var(--radius-pill, 999px)', border: '1px solid var(--color-border, rgba(0,0,0,0.2))', fontWeight: 600, fontSize: 15 }}>
                {localized(p.name, locale)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

const Testimonial: SectionComponent<'testimonial'> = ({ section, locale }) => (
  <section style={S.section}>
    <div style={S.container}>
      {section.heading && <h2 style={{ ...S.h2, textAlign: 'center' }}>{localized(section.heading, locale)}</h2>}
      <div style={S.grid2}>
        {section.quotes.map((q, i) => (
          <figure key={i} style={{ ...S.card, margin: 0 }}>
            <blockquote style={{ margin: 0, fontFamily: 'var(--font-display, inherit)', fontSize: 19, lineHeight: 1.4, color: 'var(--color-text-primary, #17171a)' }}>
              “{localized(q.quote, locale)}”
            </blockquote>
            <figcaption style={{ marginTop: 'var(--space-4, 24px)', fontSize: 14 }}>
              <strong>{localized(q.author, locale)}</strong>
              {q.role && <span style={S.muted}> — {localized(q.role, locale)}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
);

const Faq: SectionComponent<'faq'> = ({ section, locale }) => (
  <section style={S.section}>
    <div style={{ ...S.container, maxWidth: 760 }}>
      {section.heading && <h2 style={S.h2}>{localized(section.heading, locale)}</h2>}
      <div style={{ display: 'grid', gap: 'var(--space-2, 8px)' }}>
        {section.items.map((item, i) => (
          <details key={i} style={{ border: '1px solid var(--color-border, rgba(0,0,0,0.12))', borderRadius: 'var(--radius-soft, 12px)', padding: 'var(--space-3, 16px) var(--space-4, 24px)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 17, color: 'var(--color-text-primary, #17171a)' }}>{localized(item.q, locale)}</summary>
            <p style={{ ...S.muted, marginBottom: 0, marginTop: 'var(--space-2, 8px)' }}>{localized(item.a, locale)}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const Contact: SectionComponent<'contact'> = ({ section, locale }) => {
  const address = localized(section.address, locale);
  return (
    <section style={{ ...S.section, ...S.sectionMuted }} id={section.id}>
      <div style={{ ...S.container, maxWidth: 640 }}>
        {section.heading && <h2 style={S.h2}>{localized(section.heading, locale)}</h2>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3, 16px)', fontSize: 16 }}>
          {section.email && (
            <li>
              <a href={`mailto:${section.email}`} style={{ color: 'var(--color-brand-500, #333)' }}>{section.email}</a>
            </li>
          )}
          {section.phone && (
            <li dir="ltr" style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>
              <a href={`tel:${section.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{section.phone}</a>
            </li>
          )}
          {address && <li style={S.muted}>{address}</li>}
        </ul>
      </div>
    </section>
  );
};

/** The complete default set — total over every section type. */
export const coreDefaults: SectionComponents = {
  hero: Hero,
  stats: Stats,
  services: Services,
  process: Process,
  portfolio: Portfolio,
  partners: Partners,
  testimonial: Testimonial,
  faq: Faq,
  contact: Contact,
};

/**
 * Resolve the component for a section type: the theme's override if it provides
 * one, otherwise the neutral core default. This is what makes token-only and
 * partial themes render every section.
 */
export function resolveSection<T extends SectionType>(
  theme: { components: Partial<SectionComponents> },
  type: T,
): SectionComponent<T> {
  return (theme.components[type] ?? coreDefaults[type]) as SectionComponent<T>;
}

/** Convenience: resolve directly from a section instance. */
export function resolveSectionComponent(
  theme: { components: Partial<SectionComponents> },
  section: Section,
): SectionComponent<SectionType> {
  return resolveSection(theme, section.type);
}
