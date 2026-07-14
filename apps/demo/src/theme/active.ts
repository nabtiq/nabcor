import type { NabcorTheme } from '@nabcor/core';
import { novalt } from '@nabcor/theme-novalt';
import { plain } from '@nabcor/theme-plain';

/**
 * Active theme, chosen at BUILD time by the NABCOR_THEME env var (locked
 * decision: build-time theme resolution). Default is Novalt; `NABCOR_THEME=plain
 * npm run build` swaps in the token-only fixture to prove the fallback works.
 * The id is written to <html data-theme> so the matching token scope wins.
 */
export const activeThemeId: 'novalt' | 'plain' = process.env.NABCOR_THEME === 'plain' ? 'plain' : 'novalt';
export const activeTheme: NabcorTheme = activeThemeId === 'plain' ? plain : novalt;
