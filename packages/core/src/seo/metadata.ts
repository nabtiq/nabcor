/**
 * Metadata builders that map `SiteContent` onto Next.js `Metadata`. SEO is on
 * by default here — the app calls one function and gets canonical URLs,
 * hreflang alternates, OpenGraph, and Twitter cards for free.
 */
import type { Metadata } from 'next';
import type { Locale, SiteContent } from '../schema/content';
import { localized } from '../util/localized';

export interface PageMetaInput {
  content: SiteContent;
  locale: Locale;
  /** Path WITHOUT the locale prefix, e.g. "" for home or "/about". */
  path?: string;
  title?: string;
  description?: string;
}

/** Build `alternates.languages` hreflang map for a path across all locales. */
function hreflangAlternates(content: SiteContent, path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of content.locales) out[l] = `${content.seo.siteUrl}/${l}${path}`;
  out['x-default'] = `${content.seo.siteUrl}/${content.defaultLocale}${path}`;
  return out;
}

export function buildMetadata({ content, locale, path = '', title, description }: PageMetaInput): Metadata {
  const name = localized(content.business.name, locale);
  const resolvedTitle = title ? `${title} — ${name}` : `${name} — ${localized(content.business.tagline, locale)}`;
  const resolvedDesc = description ?? localized(content.business.tagline, locale);
  const canonical = `${content.seo.siteUrl}/${locale}${path}`;

  return {
    metadataBase: new URL(content.seo.siteUrl),
    title: resolvedTitle,
    description: resolvedDesc,
    alternates: {
      canonical,
      languages: hreflangAlternates(content, path),
    },
    robots: content.seo.index === false ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: name,
      title: resolvedTitle,
      description: resolvedDesc,
      url: canonical,
      locale,
      ...(content.seo.ogImage ? { images: [{ url: content.seo.ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDesc,
      ...(content.seo.ogImage ? { images: [content.seo.ogImage] } : {}),
    },
  };
}
