import type { MetadataRoute } from 'next';
import type { SiteContent } from '../schema/content';

/** robots.txt derived from content. Indexable unless `seo.index === false`. */
export function buildRobots(content: SiteContent): MetadataRoute.Robots {
  const allow = content.seo.index !== false;
  return {
    rules: allow ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' },
    sitemap: `${content.seo.siteUrl}/sitemap.xml`,
    host: content.seo.siteUrl,
  };
}
