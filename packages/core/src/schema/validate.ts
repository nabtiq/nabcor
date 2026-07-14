/**
 * Runtime validation for site content, with errors written for humans.
 *
 * The audit found the single most dangerous class of bug in these sites is
 * silent content gaps (a form that sends nowhere, a missing tagline that ships
 * as a blank). `validateContent` is the guardrail: it runs in
 * `npm run validate-content` and prints plain-language messages a
 * non-developer can act on, e.g.
 *   Missing: business.tagline.en — the English tagline is required.
 */
import { z } from 'zod';
import type { SiteContent } from './content';

/** ar + en required and non-empty; extra locales allowed. */
const localizedText = z
  .object({ ar: z.string().min(1), en: z.string().min(1) })
  .catchall(z.string());

const cta = z.object({ label: localizedText, href: z.string().min(1) });
const media = z.object({ src: z.string().min(1), alt: localizedText });

const heroSection = z.object({
  type: z.literal('hero'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  recipe: z.enum(['centered-text', 'split-image-right', 'split-image-left', 'fullbleed-video']),
  eyebrow: localizedText.optional(),
  headline: localizedText,
  subheadline: localizedText.optional(),
  cta: cta.optional(),
  secondaryCta: cta.optional(),
  media: media.optional(),
});

const statsSection = z.object({
  type: z.literal('stats'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  heading: localizedText.optional(),
  items: z.array(z.object({ value: localizedText, label: localizedText })).min(1),
});

const servicesSection = z.object({
  type: z.literal('services'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  recipe: z.enum(['grid-3up', 'grid-2up', 'list']),
  heading: localizedText.optional(),
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        title: localizedText,
        description: localizedText,
        icon: z.string().optional(),
        href: z.string().optional(),
      }),
    )
    .min(1),
});

const processSection = z.object({
  type: z.literal('process'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  heading: localizedText.optional(),
  stages: z
    .array(z.object({ step: z.string().min(1), title: localizedText, body: localizedText }))
    .min(1),
});

const portfolioSection = z.object({
  type: z.literal('portfolio'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  heading: localizedText.optional(),
  projects: z
    .array(z.object({ client: localizedText, description: localizedText, image: z.string().optional() }))
    .min(1),
});

const partnersSection = z.object({
  type: z.literal('partners'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  heading: localizedText.optional(),
  // logo optional by design: real clients send partner names as text only.
  partners: z.array(z.object({ name: localizedText, logo: z.string().optional() })).min(1),
});

const testimonialSection = z.object({
  type: z.literal('testimonial'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  heading: localizedText.optional(),
  quotes: z
    .array(z.object({ quote: localizedText, author: localizedText, role: localizedText.optional() }))
    .min(1),
});

const faqSection = z.object({
  type: z.literal('faq'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  heading: localizedText.optional(),
  items: z.array(z.object({ q: localizedText, a: localizedText })).min(1),
});

const contactSection = z.object({
  type: z.literal('contact'),
  id: z.string().min(1),
  agentSummary: localizedText.optional(),
  heading: localizedText.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: localizedText.optional(),
  whatsapp: z.string().regex(/^\d{6,15}$/, 'digits only, no + or spaces').optional(),
});

const section = z.discriminatedUnion('type', [
  heroSection,
  statsSection,
  servicesSection,
  processSection,
  portfolioSection,
  partnersSection,
  testimonialSection,
  faqSection,
  contactSection,
]);

const businessInfo = z.object({
  name: localizedText,
  tagline: localizedText,
  logo: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: localizedText.optional(),
  social: z
    .object({
      linkedin: z.string().optional(),
      instagram: z.string().optional(),
      x: z.string().optional(),
      facebook: z.string().optional(),
      youtube: z.string().optional(),
    })
    .optional(),
});

const seoConfig = z.object({
  siteUrl: z.string().url(),
  ogImage: z.string().optional(),
  index: z.boolean().optional(),
});

export const siteContentSchema = z
  .object({
    business: businessInfo,
    locales: z.array(z.string().min(1)).min(1),
    defaultLocale: z.string().min(1),
    seo: seoConfig,
    sections: z.array(section).min(1),
  })
  .superRefine((data, ctx) => {
    if (!data.locales.includes(data.defaultLocale)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultLocale'],
        message: `defaultLocale "${data.defaultLocale}" is not in locales [${data.locales.join(', ')}]`,
      });
    }
  });

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Turn a dotted path + zod issue into a sentence a non-developer can act on. */
function humanize(issue: z.ZodIssue): string {
  const path = issue.path.join('.') || '(root)';
  const field = path === '(root)' ? 'the content file' : path;
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        return `Missing: ${field} — this field is required.`;
      }
      return `Wrong type: ${field} should be ${issue.expected}, got ${issue.received}.`;
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') return `Empty: ${field} — this text cannot be blank.`;
      if (issue.type === 'array') return `Empty list: ${field} — add at least ${issue.minimum} item.`;
      return `Too small: ${field}.`;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return `Invalid email: ${field}.`;
      if (issue.validation === 'url') return `Invalid URL: ${field} — include https://.`;
      return `Invalid value: ${field}.`;
    case z.ZodIssueCode.invalid_enum_value:
      return `Not allowed: ${field} — "${String(issue.received)}" is not one of ${issue.options.map(String).join(' | ')}.`;
    default:
      return `${field}: ${issue.message}`;
  }
}

/**
 * Validate a content object. Returns `{ ok, errors }`; `errors` is empty when
 * `ok` is true. Never throws — callers decide how to surface the messages.
 */
export function validateContent(data: unknown): ValidationResult {
  const parsed = siteContentSchema.safeParse(data);
  if (parsed.success) return { ok: true, errors: [] };
  const errors = parsed.error.issues.map(humanize);
  // Stable, de-duplicated order so CLI output is deterministic.
  return { ok: false, errors: [...new Set(errors)] };
}

/** Convenience: validate and throw with a combined message (used in tests). */
export function assertValidContent(data: unknown): asserts data is SiteContent {
  const { ok, errors } = validateContent(data);
  if (!ok) throw new Error(`Invalid content:\n - ${errors.join('\n - ')}`);
}
