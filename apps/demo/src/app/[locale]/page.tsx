import { setRequestLocale } from 'next-intl/server';
import { SectionRenderer, Header, Footer, WhatsAppFloat, JsonLd } from '@nabcor/core/components';
import { organizationJsonLd, websiteJsonLd } from '@nabcor/core';
import { content } from '@/content/novalt';
import { activeTheme } from '@/theme/active';
import { nav, footerColumns, localeNames, footerNote } from '@/content/chrome';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header
        business={content.business}
        nav={nav}
        locale={locale}
        locales={content.locales}
        localeNames={localeNames}
      />
      <main>
        <JsonLd data={organizationJsonLd(content, locale)} />
        <JsonLd data={websiteJsonLd(content, locale)} />
        <SectionRenderer theme={activeTheme} sections={content.sections} locale={locale} />
      </main>
      <Footer business={content.business} columns={footerColumns} locale={locale} copyright={footerNote} />
      {content.business.whatsapp && (
        <WhatsAppFloat
          phone={content.business.whatsapp}
          label={locale === 'ar' ? 'راسلنا على واتساب' : 'Chat on WhatsApp'}
          locale={locale}
        />
      )}
    </>
  );
}
