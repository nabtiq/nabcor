/**
 * Generate `llms.txt` from the content schema — NOT hand-written. AI agents
 * consume this to understand the site. Because every section can carry an
 * `agentSummary`, the machine-readable view is derived from the same source of
 * truth as the rendered page and cannot drift.
 */
import type { Locale, Section, SiteContent } from '../schema/content';
import { localized } from '../util/localized';

function sectionLine(section: Section, locale: Locale): string | null {
  const summary = section.agentSummary ? localized(section.agentSummary, locale) : '';
  switch (section.type) {
    case 'hero':
      return `- Hero: ${localized(section.headline, locale)}${summary ? ` — ${summary}` : ''}`;
    case 'services':
      return `- Services: ${section.items.map((s) => localized(s.title, locale)).join(', ')}${summary ? ` — ${summary}` : ''}`;
    case 'portfolio':
      return `- Projects: ${section.projects.map((p) => localized(p.client, locale)).join(', ')}`;
    case 'partners':
      return `- Partners: ${section.partners.map((p) => localized(p.name, locale)).join(', ')}`;
    case 'faq':
      return `- FAQ: ${section.items.map((f) => localized(f.q, locale)).join(' | ')}`;
    case 'contact': {
      const bits = [section.email, section.phone].filter(Boolean).join(', ');
      return `- Contact: ${bits}`;
    }
    default:
      return summary ? `- ${section.type}: ${summary}` : null;
  }
}

export function generateLlmsTxt(content: SiteContent, locale: Locale = content.defaultLocale): string {
  const name = localized(content.business.name, locale);
  const tagline = localized(content.business.tagline, locale);
  const lines: string[] = [
    `# ${name}`,
    '',
    `> ${tagline}`,
    '',
    `Site: ${content.seo.siteUrl}`,
    `Languages: ${content.locales.join(', ')}`,
    '',
    '## Overview',
    '',
  ];
  for (const section of content.sections) {
    const line = sectionLine(section, locale);
    if (line) lines.push(line);
  }
  lines.push('');
  return lines.join('\n');
}
