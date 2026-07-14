import { defineRouting } from 'next-intl/routing';

/**
 * nabcor default routing: locale is ALWAYS in the path (`/en`, `/ar`). Keeping
 * the locale in the URL is what lets direction be a server concern set on
 * `<html>` — this is the fix for the audited client-side `dir` flash.
 */
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
