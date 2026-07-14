/**
 * Generic section renderer. Given a theme and a list of sections, it renders
 * each section with the theme's component for that type. Apps never hand-write
 * a `switch` over section types — this is the single dispatch point, and the
 * theme contract guarantees a component exists for every type.
 */
import type { NabcorTheme } from '../contracts/theme';
import { componentForSection } from '../contracts/theme';
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
        const Component = componentForSection(theme, section);
        return <Component key={section.id} section={section} locale={locale} />;
      })}
    </>
  );
}
