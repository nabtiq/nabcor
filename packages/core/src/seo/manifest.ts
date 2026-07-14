import type { MetadataRoute } from 'next';
import type { Locale, SiteContent } from '../schema/content';
import { localized } from '../util/localized';

/** PWA/webmanifest derived from content. Theme color falls back to a token. */
export function buildManifest(
  content: SiteContent,
  locale: Locale = content.defaultLocale,
  opts: { themeColor?: string; backgroundColor?: string } = {},
): MetadataRoute.Manifest {
  const name = localized(content.business.name, locale);
  return {
    name,
    short_name: name.slice(0, 12),
    description: localized(content.business.tagline, locale),
    start_url: `/${content.defaultLocale}`,
    display: 'standalone',
    background_color: opts.backgroundColor ?? '#ffffff',
    theme_color: opts.themeColor ?? '#6d28d9',
    icons: content.business.logo
      ? [{ src: content.business.logo, sizes: 'any', type: 'image/svg+xml' }]
      : [],
  };
}
