/**
 * Minimal RSS 2.0 feed for article content. Sites without a blog simply pass an
 * empty list (or don't expose the route). Kept dependency-free.
 */
import type { ArticleContent, Locale, SiteContent } from '../schema/content';
import { localized } from '../util/localized';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildRssFeed(
  content: SiteContent,
  articles: ArticleContent[],
  locale: Locale = content.defaultLocale,
): string {
  const site = content.seo.siteUrl;
  const title = esc(localized(content.business.name, locale));
  const desc = esc(localized(content.business.tagline, locale));
  const items = articles
    .map((a) => {
      const link = `${site}/${locale}/insights/${a.slug}`;
      return `    <item>
      <title>${esc(localized(a.title, locale))}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <description>${esc(localized(a.description, locale))}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${title}</title>
    <link>${site}/${locale}</link>
    <description>${desc}</description>
    <language>${locale}</language>
${items}
  </channel>
</rss>`;
}
