import type { NabcorTheme } from '@nabcor/core';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Services } from './components/Services';
import { Process } from './components/Process';
import { Portfolio } from './components/Portfolio';
import { Partners } from './components/Partners';
import { Testimonial } from './components/Testimonial';
import { Faq } from './components/Faq';
import { Contact } from './components/Contact';

/**
 * Novalt theme definition. `components` is total over every section type — omit
 * one and the TypeScript build fails (that check IS the theme system). The demo
 * imports this and passes it to `<SectionRenderer>`.
 */
export const novalt: NabcorTheme = {
  id: 'novalt',
  displayName: 'Novalt',
  tokensPath: '@nabcor/theme-novalt/tokens.css',
  supportedRecipes: {
    hero: ['centered-text', 'split-image-right', 'split-image-left', 'fullbleed-video'],
    services: ['grid-3up', 'grid-2up', 'list'],
  },
  components: {
    hero: Hero,
    stats: Stats,
    services: Services,
    process: Process,
    portfolio: Portfolio,
    partners: Partners,
    testimonial: Testimonial,
    faq: Faq,
    contact: Contact,
  },
};
