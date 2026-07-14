import type { NavLink, FooterColumn } from '@nabcor/core/components';
import type { LocalizedText } from '@nabcor/core';

/** Site chrome: header nav, footer columns, locale display names. */
export const nav: NavLink[] = [
  { label: { en: 'Services', ar: 'الخدمات' }, href: '#services' },
  { label: { en: 'Work', ar: 'الأعمال' }, href: '#portfolio' },
  { label: { en: 'Process', ar: 'المنهجية' }, href: '#process' },
  { label: { en: 'Contact', ar: 'تواصل' }, href: '#contact' },
];

export const footerColumns: FooterColumn[] = [
  {
    heading: { en: 'Company', ar: 'الشركة' },
    links: [
      { label: { en: 'Services', ar: 'الخدمات' }, href: '#services' },
      { label: { en: 'Work', ar: 'الأعمال' }, href: '#portfolio' },
    ],
  },
  {
    heading: { en: 'Connect', ar: 'تواصل' },
    links: [
      { label: { en: 'Contact', ar: 'اتصل بنا' }, href: '#contact' },
      { label: { en: 'LinkedIn', ar: 'لينكدإن' }, href: 'https://www.linkedin.com/company/novalt' },
    ],
  },
  {
    heading: { en: 'Legal', ar: 'قانوني' },
    links: [
      { label: { en: 'Privacy', ar: 'الخصوصية' }, href: '#' },
      { label: { en: 'Terms', ar: 'الشروط' }, href: '#' },
    ],
  },
];

export const localeNames: Record<string, string> = {
  en: 'EN',
  ar: 'ع',
};

export const footerNote: LocalizedText = {
  en: 'Built on nabcor.',
  ar: 'مبني على nabcor.',
};
