import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';
import { ContactForm, type ContactLabels } from '@nabcor/core/components';

const LABELS: Record<'ar' | 'en', ContactLabels> = {
  en: {
    name: 'Name',
    email: 'Work email',
    service: 'Interest',
    selectService: 'Select…',
    message: 'How can we help?',
    submit: 'Send message',
    sending: 'Sending…',
    success: 'Thanks — we reply within one business day.',
    error: 'Something went wrong. Please email us directly.',
  },
  ar: {
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    service: 'الاهتمام',
    selectService: 'اختر…',
    message: 'كيف يمكننا مساعدتك؟',
    submit: 'إرسال الرسالة',
    sending: 'جارٍ الإرسال…',
    success: 'شكرًا لك — نرد خلال يوم عمل واحد.',
    error: 'حدث خطأ ما. يُرجى مراسلتنا مباشرة.',
  },
};

export function Contact({ section, locale }: SectionProps<'contact'>) {
  const heading = localized(section.heading, locale);
  const labels = LABELS[locale === 'ar' ? 'ar' : 'en'];
  const address = localized(section.address, locale);

  return (
    <section className="nv-section nv-section--muted" id={section.id}>
      <div className="nv-container" style={{ display: 'grid', gap: 'var(--space-7)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'start' }}>
        <div>
          {heading && <h2 className="nv-h2" style={{ marginBottom: 'var(--space-4)' }}>{heading}</h2>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)', fontSize: '16px' }}>
            {section.email && (
              <li>
                <a href={`mailto:${section.email}`} style={{ color: 'var(--color-brand-600)' }}>{section.email}</a>
              </li>
            )}
            {section.phone && (
              <li dir="ltr" style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>
                <a href={`tel:${section.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{section.phone}</a>
              </li>
            )}
            {address && <li className="nv-muted">{address}</li>}
          </ul>
        </div>
        <ContactForm labels={labels} />
      </div>
    </section>
  );
}
