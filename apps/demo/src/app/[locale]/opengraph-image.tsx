import { renderOgImage, ogSize, ogContentType } from '@nabcor/core/server';
import { routing } from '@/i18n/routing';
import { content } from '@/content/novalt';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Novalt';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Latin overrides: next/og cannot shape Arabic without an embedded font, and
  // OG cards are conventionally single-language. Supply an Arabic font via a
  // custom ImageResponse if a localized card is required.
  return renderOgImage({
    content,
    locale,
    name: 'Novalt',
    title: 'Software that compounds',
    colors: { bg: '#1b0940', fg: '#ffffff', accent: '#9b74fb' },
  });
}
