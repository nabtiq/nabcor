/**
 * nabcor content contract.
 *
 * This is the single source of truth for the *shape* of a site's content.
 * Every theme MUST be able to render every section type declared here
 * (enforced at compile time by `NabcorTheme.components` — see
 * ../contracts/theme.ts).
 *
 * Design rules that this file encodes:
 *  - Content is code-resident and locale-aware from the first field. There is
 *    no runtime CMS; a `content.ts` file IS the content store.
 *  - Every section carries an optional `agentSummary` — a short,
 *    machine-readable semantic summary. AI agents increasingly consume sites
 *    directly, so structured content is a machine-readable asset by default,
 *    not a retrofit.
 *  - `portfolio` and `partners` exist because real client intake (Josoor
 *    Al-Azel) contained an "Our latest projects" block and a partner list that
 *    the original theoretical schema had no slot for. `partners[].logo` is
 *    optional precisely because that client sent partner names as text only.
 */

/**
 * A locale code. `ar` and `en` are first-class; the `(string & {})` opening
 * keeps the type extensible without losing autocomplete — e.g. oliiva runs
 * ar/en/es/fr.
 */
export type Locale = 'ar' | 'en' | (string & {});

/**
 * Localized text. `ar` and `en` are required (every nabcor site is at least
 * bilingual); additional locales are optional so a 4-locale site stays valid.
 */
export type LocalizedText = { ar: string; en: string } & Partial<Record<string, string>>;

/** A call-to-action button. `href` is an in-site path or absolute URL. */
export interface Cta {
  label: LocalizedText;
  href: string;
}

/** A media reference. `src` is a path under the site's `public/`. */
export interface Media {
  src: string;
  alt: LocalizedText;
}

/** Fields shared by every section. */
interface SectionBase {
  /** Stable, unique id — used as the anchor and React key. */
  id: string;
  /** Optional machine-readable summary for AI agents and llms.txt. */
  agentSummary?: LocalizedText;
}

/* ─────────────────────────── Section types ─────────────────────────── */

export type HeroRecipe =
  | 'centered-text'
  | 'split-image-right'
  | 'split-image-left'
  | 'fullbleed-video';

export interface HeroSection extends SectionBase {
  type: 'hero';
  recipe: HeroRecipe;
  eyebrow?: LocalizedText;
  headline: LocalizedText;
  subheadline?: LocalizedText;
  cta?: Cta;
  secondaryCta?: Cta;
  /** Image for split recipes; video src for `fullbleed-video`. */
  media?: Media;
}

export interface StatItem {
  /** e.g. "150+" — kept as free text so units/symbols travel with the value. */
  value: LocalizedText;
  label: LocalizedText;
}

export interface StatsSection extends SectionBase {
  type: 'stats';
  heading?: LocalizedText;
  items: StatItem[];
}

export type ServicesRecipe = 'grid-3up' | 'grid-2up' | 'list';

export interface ServiceItem {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  /** Optional icon key resolved by the theme (never a raw asset path). */
  icon?: string;
  href?: string;
}

export interface ServicesSection extends SectionBase {
  type: 'services';
  recipe: ServicesRecipe;
  heading?: LocalizedText;
  items: ServiceItem[];
}

export interface ProcessStage {
  /** Display index, e.g. "01". */
  step: string;
  title: LocalizedText;
  body: LocalizedText;
}

export interface ProcessSection extends SectionBase {
  type: 'process';
  heading?: LocalizedText;
  /** Rendered as a 4-stage vertical narrative by the reference theme. */
  stages: ProcessStage[];
}

export interface PortfolioProject {
  client: LocalizedText;
  description: LocalizedText;
  /** Optional — real intake often arrives without usable project photos. */
  image?: string;
}

export interface PortfolioSection extends SectionBase {
  type: 'portfolio';
  heading?: LocalizedText;
  projects: PortfolioProject[];
}

export interface Partner {
  name: LocalizedText;
  /** Optional — clients frequently supply partner names as text only. */
  logo?: string;
}

export interface PartnersSection extends SectionBase {
  type: 'partners';
  heading?: LocalizedText;
  partners: Partner[];
}

export interface Testimonial {
  quote: LocalizedText;
  author: LocalizedText;
  role?: LocalizedText;
}

export interface TestimonialSection extends SectionBase {
  type: 'testimonial';
  heading?: LocalizedText;
  quotes: Testimonial[];
}

export interface FaqItem {
  q: LocalizedText;
  a: LocalizedText;
}

export interface FaqSection extends SectionBase {
  type: 'faq';
  heading?: LocalizedText;
  items: FaqItem[];
}

export interface ContactSection extends SectionBase {
  type: 'contact';
  heading?: LocalizedText;
  phone?: string;
  email?: string;
  address?: LocalizedText;
  /** Digits only, no `+` or spaces — e.g. "971501234567". */
  whatsapp?: string;
}

/** The discriminated union every renderer switches over. */
export type Section =
  | HeroSection
  | StatsSection
  | ServicesSection
  | ProcessSection
  | PortfolioSection
  | PartnersSection
  | TestimonialSection
  | FaqSection
  | ContactSection;

/** The literal `type` discriminator of every section. */
export type SectionType = Section['type'];

/* ─────────────────────────── Site content ─────────────────────────── */

export interface BusinessInfo {
  name: LocalizedText;
  tagline: LocalizedText;
  /** Path under `public/` (e.g. `/media/brand/logo.svg`). */
  logo?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: LocalizedText;
  social?: {
    linkedin?: string;
    instagram?: string;
    x?: string;
    facebook?: string;
    youtube?: string;
  };
}

export interface SeoConfig {
  /** Canonical origin, no trailing slash — e.g. `https://novalt.example`. */
  siteUrl: string;
  /** Default OG/twitter image path under `public/`. */
  ogImage?: string;
  /** Robots index/follow default. */
  index?: boolean;
}

/**
 * The full content of a site. One `SiteContent` object per site drives every
 * page, every locale, sitemap, robots, manifest, JSON-LD, and llms.txt.
 */
export interface SiteContent {
  business: BusinessInfo;
  /** Locales this site ships. `defaultLocale` MUST be one of them. */
  locales: Locale[];
  defaultLocale: Locale;
  seo: SeoConfig;
  /** Home-page sections, rendered top to bottom in array order. */
  sections: Section[];
}

/* ─────────────────────────── Articles ─────────────────────────── */

/**
 * Long-form content (blog / insights). Kept deliberately separate from
 * `SiteContent` — consulting, medical, and legal clients need articles, and
 * shoehorning them into the section union would pollute every home page.
 */
export interface ArticleContent {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  /** ISO date. */
  publishedAt: string;
  updatedAt?: string;
  author: LocalizedText;
  /** Markdown body, one per locale. */
  body: LocalizedText;
  tags?: string[];
  heroImage?: string;
  agentSummary?: LocalizedText;
}

/** Narrow a section to a concrete member by its `type`. */
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;
