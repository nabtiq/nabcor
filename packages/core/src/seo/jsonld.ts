/**
 * Pure JSON-LD builders. They return plain objects; render them with the
 * `<JsonLd>` component. Kept out of components so they are usable in any server
 * context (metadata, tests) without pulling React in.
 */
import type { FaqSection, Locale, SiteContent } from '../schema/content';
import { localized } from '../util/localized';

export function organizationJsonLd(content: SiteContent, locale: Locale) {
  const { business, seo } = content;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: localized(business.name, locale),
    description: localized(business.tagline, locale),
    url: seo.siteUrl,
    ...(business.logo ? { logo: `${seo.siteUrl}${business.logo}` } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.social
      ? { sameAs: Object.values(business.social).filter(Boolean) }
      : {}),
  };
}

export function websiteJsonLd(content: SiteContent, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: localized(content.business.name, locale),
    url: content.seo.siteUrl,
    inLanguage: locale,
  };
}

export function faqJsonLd(section: FaqSection, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: section.items.map((item) => ({
      '@type': 'Question',
      name: localized(item.q, locale),
      acceptedAnswer: { '@type': 'Answer', text: localized(item.a, locale) },
    })),
  };
}
