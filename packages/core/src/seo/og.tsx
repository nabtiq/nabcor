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

export function renderOgImage({
  content,
  locale,
  title,
  name,
  colors = {},
}: {
  content: SiteContent;
  locale: Locale;
  title?: string;
  /**
   * Brand name override. next/og's font engine cannot shape complex scripts
   * (Arabic, etc.) without an embedded font, so callers pass a Latin override
   * for non-Latin locales unless they supply a font via a custom ImageResponse.
   */
  name?: string;
  colors?: { bg?: string; fg?: string; accent?: string };
}): ImageResponse {
  const bg = colors.bg ?? '#140b2e';
  const fg = colors.fg ?? '#ffffff';
  const accent = colors.accent ?? '#8b5cf6';
  const displayName = name ?? localized(content.business.name, locale);
  const heading = title ?? localized(content.business.tagline, locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: bg,
          color: fg,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 24, height: 24, borderRadius: 9999, background: accent, display: 'flex' }} />
          <span style={{ fontSize: 34, fontWeight: 700 }}>{displayName}</span>
        </div>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.1, maxWidth: '80%' }}>{heading}</div>
        <div style={{ display: 'flex', fontSize: 26, color: accent }}>{content.seo.siteUrl.replace(/^https?:\/\//, '')}</div>
      </div>
    ),
    { ...ogSize },
  );
}
