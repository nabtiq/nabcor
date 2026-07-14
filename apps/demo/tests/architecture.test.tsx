/**
 * Minimal tests protecting the alpha-hardening architecture (not a broad suite):
 *  1. resolveSection — theme override vs core-default fallback
 *  2. token-only theme (components: {}) renders every section via defaults
 *  3. validator — valid passes, invalid fails
 *  4. Arabic OG — renders a real PNG with the embedded Arabic font
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { resolveSection, coreDefaults, validateContent } from '@nabcor/core';
import { renderOgImage } from '@nabcor/core/server';
import { SectionRenderer } from '@nabcor/core/components';
import { novalt } from '@nabcor/theme-novalt';
import { plain } from '@nabcor/theme-plain';
import { content } from '../src/content/novalt';
import { brokenContent } from '../src/content/novalt.broken';
import { arabicFontData } from '../src/fonts/arabic-font-data';

describe('resolveSection (theme fallback)', () => {
  it('returns the theme override when the theme provides one', () => {
    // Novalt overrides every section type.
    expect(resolveSection(novalt, 'hero')).toBe(novalt.components.hero);
    expect(resolveSection(novalt, 'contact')).toBe(novalt.components.contact);
  });

  it('returns the core default when the theme omits that type', () => {
    // Plain is token-only: components: {}
    expect(Object.keys(plain.components)).toHaveLength(0);
    expect(resolveSection(plain, 'hero')).toBe(coreDefaults.hero);
    expect(resolveSection(plain, 'faq')).toBe(coreDefaults.faq);
    expect(resolveSection(plain, 'partners')).toBe(coreDefaults.partners);
  });
});

describe('token-only theme renders every section via core defaults', () => {
  it('plain (components: {}) renders all section headings in both locales', () => {
    for (const locale of ['en', 'ar'] as const) {
      const html = renderToStaticMarkup(
        createElement(SectionRenderer, { theme: plain, sections: content.sections, locale }),
      );
      // Every section type appears in the content; check a marker from each.
      const markers = content.sections.map((s) => {
        switch (s.type) {
          case 'hero':
            return s.headline[locale];
          case 'services':
          case 'stats':
          case 'process':
          case 'portfolio':
          case 'partners':
          case 'testimonial':
          case 'faq':
          case 'contact':
            return s.heading?.[locale] ?? s.id;
        }
      });
      for (const m of markers) {
        expect(html, `plain/${locale} missing section marker: ${m}`).toContain(m);
      }
    }
  });
});

describe('content validator', () => {
  it('accepts valid content', () => {
    const res = validateContent(content);
    expect(res.ok, res.errors.join('; ')).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects invalid content with plain-language errors', () => {
    const res = validateContent(brokenContent);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    // e.g. "Missing: business.name.en …"
    expect(res.errors.some((e) => e.includes('business.name.en'))).toBe(true);
  });
});

describe('Arabic OG image', () => {
  it('renders a real PNG for /ar using the embedded Arabic font', async () => {
    const img = renderOgImage({
      content,
      locale: 'ar',
      colors: { bg: '#1b0940', fg: '#ffffff', accent: '#9b74fb' },
      fonts: [{ name: 'IBM Plex Arabic', data: arabicFontData(), weight: 600 }],
    });
    const buf = Buffer.from(await img.arrayBuffer());
    expect(buf.length).toBeGreaterThan(2000);
    // PNG magic number
    expect([...buf.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});
