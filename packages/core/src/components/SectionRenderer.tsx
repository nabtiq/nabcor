/**
 * Generic section renderer. Given a theme and a list of sections, it renders
 * each section with the theme's component for that type — or the neutral core
 * default when the theme doesn't override that type (see `resolveSection`).
 * Apps never hand-write a `switch` over section types.
 */
import type { NabcorTheme } from '../contracts/theme';
import { resolveSection } from '../defaults';
import type { Locale, Section } from '../schema/content';

export function SectionRenderer({
  theme,
  sections,
  locale,
}: {
  theme: NabcorTheme;
  sections: Section[];
  locale: Locale;
}) {
  return (
    <>
      {sections.map((section) => {
        const Component = resolveSection(theme, section.type);
        return <Component key={section.id} section={section as never} locale={locale} />;
      })}
    </>
  );
}
