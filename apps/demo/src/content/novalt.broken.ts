/**
 * A DELIBERATELY broken content file, used to demonstrate that
 * `npm run validate-content -- broken` catches gaps in plain language before a
 * site can ship them. Typed `unknown` so it does not break `tsc` — validation
 * is a runtime guard, which is exactly the point.
 */
export const brokenContent: unknown = {
  business: {
    // name.en missing → "Missing: business.name.en"
    name: { ar: 'شركة' },
    // tagline missing entirely
  },
  locales: ['en'],
  defaultLocale: 'fr', // not in locales → surfaced
  seo: {
    siteUrl: 'novalt', // not a URL → "Invalid URL"
  },
  sections: [
    {
      type: 'hero',
      id: 'hero',
      recipe: 'centered-text',
      headline: { en: '', ar: '' }, // empty → "Empty: ...headline.en"
    },
    {
      type: 'services',
      id: 'services',
      recipe: 'grid-3up',
      items: [], // empty list → "Empty list"
    },
  ],
};
