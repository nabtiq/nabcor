import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { dirFor, buildMetadata } from '@nabcor/core';
import { routing } from '@/i18n/routing';
import { content } from '@/content/novalt';
import { activeThemeId } from '@/theme/active';
import '@/app/globals.css';

/**
 * Local Arabic font (IBM Plex Sans Arabic), self-hosted in the repo — no
 * Google Fonts at build time. Exposed as --font-arabic-local, which the theme
 * token stacks include so Arabic glyphs fall through to it per-glyph
 * everywhere (headings, body, core defaults) while Latin keeps its primary.
 */
const arabic = localFont({
  src: [
    { path: '../../fonts/IBMPlexSansArabic-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../fonts/IBMPlexSansArabic-SemiBold.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-arabic-local',
  display: 'swap',
});

/** Prerender both locales at build time (static-first). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({ content, locale });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();

  // Enables static rendering for this locale, and — crucially — makes `dir`
  // and `lang` a SERVER decision on <html>, correct on first paint.
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dirFor(locale)} data-theme={activeThemeId} className={arabic.variable}>
      <body className="nv-body">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
