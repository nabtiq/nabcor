import { renderOgImage, ogSize, ogContentType } from '@nabcor/core/server';
import { routing } from '@/i18n/routing';
import { content } from '@/content/novalt';
import { arabicFontData } from '@/fonts/arabic-font-data';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Novalt';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Base64-embedded font (survives standalone + Docker). IBM Plex Sans Arabic
  // carries Latin glyphs too, so one font serves both locales.
  return renderOgImage({
    content,
    locale,
    colors: { bg: '#1b0940', fg: '#ffffff', accent: '#9b74fb' },
    fonts: [{ name: 'IBM Plex Arabic', data: arabicFontData(), weight: 600 }],
  });
}
