import type { MetadataRoute } from 'next';
import type { SiteContent } from '../schema/content';

/**
 * Sitemap across every locale for the given paths (paths are locale-less, e.g.
 * "" for home, "/about"). Each entry carries hreflang alternates.
 */
export function buildSitemap(content: SiteContent, paths: string[] = ['']): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    const languages: Record<string, string> = {};
    for (const l of content.locales) languages[l] = `${content.seo.siteUrl}/${l}${path}`;
    for (const l of content.locales) {
      entries.push({
        url: `${content.seo.siteUrl}/${l}${path}`,
        changeFrequency: 'monthly',
        priority: path === '' ? 1 : 0.7,
        alternates: { languages },
      });
    }
  }
  return entries;
}
