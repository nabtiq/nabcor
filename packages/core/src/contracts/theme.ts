/**
 * The theme contract.
 *
 * A theme is a package that provides one React component per section type plus
 * a token stylesheet. The key line is `SectionComponents` below: it is a
 * mapped type over EVERY `SectionType`, so if a theme omits a component for any
 * section the TypeScript build fails. That compile-time totality check *is* the
 * theme system — there is no runtime registry to forget to populate.
 */
import type { ComponentType } from 'react';
import type {
  Locale,
  Section,
  SectionType,
  SectionOf,
  HeroRecipe,
  ServicesRecipe,
} from '../schema/content';

/**
 * Props every section component receives. The `section` is narrowed to the
 * concrete member for its slot, so a hero component sees `HeroSection`, not the
 * whole union.
 */
export interface SectionProps<T extends SectionType> {
  section: SectionOf<T>;
  locale: Locale;
}

export type SectionComponent<T extends SectionType> = ComponentType<SectionProps<T>>;

/**
 * A component for every section type. Mapped over `SectionType`, so this object
 * is only assignable if it is total — omit `partners` and the build breaks.
 */
export type SectionComponents = {
  [T in SectionType]: SectionComponent<T>;
};

/**
 * Recipe support a theme declares. A theme may implement only some recipes; the
 * renderer falls back to the theme's default recipe for a section if the
 * requested one is unsupported (see `resolveRecipe`).
 */
export interface SupportedRecipes {
  hero: HeroRecipe[];
  services: ServicesRecipe[];
}

export interface NabcorTheme {
  /** Stable id, e.g. "novalt". */
  id: string;
  displayName: string;
  /**
   * Import path (relative to the theme package) of the token CSS the demo/app
   * imports once at the root. Kept as a string so the app owns the actual
   * `import` and bundlers stay happy.
   */
  tokensPath: string;
  supportedRecipes: SupportedRecipes;
  components: SectionComponents;
}

/**
 * Pick the recipe a theme will actually render for a section: the requested
 * recipe if supported, otherwise the theme's first declared recipe for that
 * kind. Pure, so it is safe in server components.
 */
export function resolveHeroRecipe(theme: NabcorTheme, requested: HeroRecipe): HeroRecipe {
  return theme.supportedRecipes.hero.includes(requested)
    ? requested
    : (theme.supportedRecipes.hero[0] ?? requested);
}

export function resolveServicesRecipe(
  theme: NabcorTheme,
  requested: ServicesRecipe,
): ServicesRecipe {
  return theme.supportedRecipes.services.includes(requested)
    ? requested
    : (theme.supportedRecipes.services[0] ?? requested);
}

/**
 * Look up the component for a section instance, fully typed. Used by the
 * generic `<SectionRenderer>` so apps never hand-wire a switch statement.
 */
export function componentForSection(theme: NabcorTheme, section: Section): SectionComponent<SectionType> {
  return theme.components[section.type] as SectionComponent<SectionType>;
}
