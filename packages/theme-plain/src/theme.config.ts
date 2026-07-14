import type { NabcorTheme } from '@nabcor/core';

/**
 * Plain theme — the token-only fixture. `components: {}` means EVERY section is
 * rendered by the Core defaults via `resolveSection`. No React components are
 * provided; only tokens differ from Novalt. If this renders all sections and
 * looks materially different from Novalt, the fallback architecture works.
 */
export const plain: NabcorTheme = {
  id: 'plain',
  displayName: 'Plain (fixture)',
  tokensPath: '@nabcor/theme-plain/tokens.css',
  supportedRecipes: {
    hero: ['centered-text', 'split-image-right', 'split-image-left', 'fullbleed-video'],
    services: ['grid-3up', 'grid-2up', 'list'],
  },
  components: {},
};
