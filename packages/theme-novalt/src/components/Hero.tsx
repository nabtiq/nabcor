import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

/** Hero — supports all four recipes: centered-text, split-image-(right|left), fullbleed-video. */
export function Hero({ section, locale }: SectionProps<'hero'>) {
  const eyebrow = localized(section.eyebrow, locale);
  const headline = localized(section.headline, locale);
  const sub = localized(section.subheadline, locale);
  const media = section.media;

  const CtaRow = section.cta ? (
    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-5)' }}>
      <a className="nv-btn nv-btn--primary" href={section.cta.href}>
        {localized(section.cta.label, locale)}
      </a>
      {section.secondaryCta && (
        <a className="nv-btn nv-btn--ghost" href={section.secondaryCta.href}>
          {localized(section.secondaryCta.label, locale)}
        </a>
      )}
    </div>
  ) : null;

  const TextBlock = (
    <div>
      {eyebrow && <span className="nv-eyebrow">{eyebrow}</span>}
      <h1 className="nv-h1">{headline}</h1>
      {sub && <p className="nv-lead" style={{ marginTop: 'var(--space-4)' }}>{sub}</p>}
      {CtaRow}
    </div>
  );

  if (section.recipe === 'fullbleed-video') {
    const isVideo = media?.src?.endsWith('.mp4') || media?.src?.endsWith('.webm');
    return (
      <section className="nv-section" style={{ position: 'relative', minHeight: '78vh', display: 'grid', alignItems: 'center', overflow: 'hidden', color: 'var(--color-on-brand)' }}>
        {isVideo ? (
          <video autoPlay muted loop playsInline aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }}>
            <source src={media!.src} />
          </video>
        ) : (
          media?.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.src} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }} />
          )
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(22,12,51,0.55), rgba(22,12,51,0.85))', zIndex: -1 }} />
        <div className="nv-container" style={{ maxWidth: '760px' }}>{TextBlock}</div>
      </section>
    );
  }

  if (section.recipe === 'centered-text') {
    return (
      <section className="nv-section" style={{ background: 'radial-gradient(60% 60% at 50% 0%, var(--color-surface-3), var(--color-surface-1))' }}>
        <div className="nv-container" style={{ maxWidth: '820px', textAlign: 'center', display: 'grid', justifyItems: 'center' }}>
          {TextBlock}
        </div>
      </section>
    );
  }

  // split-image-right (default) or split-image-left
  const imageFirst = section.recipe === 'split-image-left';
  const Image = media ? (
    <div style={{ borderRadius: 'var(--radius-soft)', overflow: 'hidden', aspectRatio: '4 / 3', background: 'var(--color-surface-3)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.src} alt={localized(media.alt, locale)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  ) : null;

  return (
    <section className="nv-section">
      <div
        className="nv-container"
        style={{ display: 'grid', gap: 'var(--space-7)', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}
      >
        {imageFirst ? (
          <>
            {Image}
            {TextBlock}
          </>
        ) : (
          <>
            {TextBlock}
            {Image}
          </>
        )}
      </div>
    </section>
  );
}
