/**
 * Dynamic OpenGraph image. Server-only (uses next/og). The app wires this into
 * an `opengraph-image` route or `/api/og`. Token colors are passed in so the
 * card matches the active theme.
 */
import { ImageResponse } from 'next/og';
import type { Locale, SiteContent } from '../schema/content';
import { localized } from '../util/localized';

export const ogSize = { width: 1200, height: 630 } as const;
export const ogContentType = 'image/png';

/**
 * satori (next/og) over-spaces the ASCII space (U+0020) for Arabic, so multi-
 * word Arabic looks scattered. A no-break space (U+00A0) renders at the font's
 * natural advance — correct spacing. It also prevents wrapping, so we split the
 * heading into balanced lines ourselves and join each line's words with NBSP.
 */
function ogHeadingLines(text: string, maxChars = 26): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.map((l) => l.replace(/ /g, String.fromCharCode(0x00a0)));
}

export interface OgFont {
  name: string;
  data: ArrayBuffer | Buffer;
  weight?: 400 | 500 | 600 | 700;
  style?: 'normal';
}

export function renderOgImage({
  content,
  locale,
  title,
  name,
  colors = {},
  fonts,
}: {
  content: SiteContent;
  locale: Locale;
  title?: string;
  /** Optional display-name override. */
  name?: string;
  colors?: { bg?: string; fg?: string; accent?: string };
  /**
   * Fonts embedded in the image. REQUIRED for non-Latin locales: next/og's
   * satori engine needs the actual font to shape complex scripts (Arabic joins
   * its letters). When a font is provided its family is used for all text, so
   * Arabic renders correctly. Callers load the font as an ArrayBuffer (e.g. via
   * `fetch(new URL('./font.ttf', import.meta.url))`, which survives standalone).
   */
  fonts?: OgFont[];
}): ImageResponse {
  const bg = colors.bg ?? '#140b2e';
  const fg = colors.fg ?? '#ffffff';
  const accent = colors.accent ?? '#8b5cf6';
  const displayName = name ?? localized(content.business.name, locale);
  const heading = title ?? localized(content.business.tagline, locale);
  const fontFamily = fonts && fonts.length ? fonts[0]!.name : 'sans-serif';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: dir === 'rtl' ? 'flex-end' : 'flex-start',
          padding: '80px',
          background: bg,
          color: fg,
          fontFamily,
          direction: dir,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 24, height: 24, borderRadius: 9999, background: accent, display: 'flex' }} />
          <span style={{ fontSize: 34, fontWeight: 600 }}>{displayName}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: dir === 'rtl' ? 'flex-end' : 'flex-start', gap: '8px' }}>
          {ogHeadingLines(heading).map((line, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 58, fontWeight: 600, lineHeight: 1.2 }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: accent }}>{content.seo.siteUrl.replace(/^https?:\/\//, '')}</div>
      </div>
    ),
    {
      ...ogSize,
      ...(fonts && fonts.length
        ? { fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight ?? 600, style: f.style ?? ('normal' as const) })) }
        : {}),
    },
  );
}
