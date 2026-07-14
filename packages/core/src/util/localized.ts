import type { Locale, LocalizedText } from '../schema/content';

/**
 * Pick the string for a locale from a `LocalizedText`, falling back to en then
 * ar then empty. Kept tiny and pure so it is safe in server components.
 */
export function localized(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  return text[locale] ?? text.en ?? text.ar ?? '';
}

/** Writing direction for a locale. Arabic is the only RTL locale we ship today. */
export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
