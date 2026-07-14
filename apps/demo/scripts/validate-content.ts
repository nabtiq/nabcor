/**
 * Content guardrail. Runs the nabcor validator over the site's content and
 * prints plain-language problems a non-developer can fix.
 *
 *   npm run validate-content            # validates the real content (must pass)
 *   npm run validate-content -- broken  # validates the broken sample (demo)
 */
import { validateContent } from '@nabcor/core';
import { content } from '../src/content/novalt';
import { brokenContent } from '../src/content/novalt.broken';

const which = process.argv[2] === 'broken' ? 'broken' : 'novalt';
const target = which === 'broken' ? brokenContent : content;

const { ok, errors } = validateContent(target);

if (ok) {
  console.log(`✓ ${which}: content is valid.`);
  process.exit(0);
}

console.error(`✗ ${which}: ${errors.length} problem(s) found:\n`);
for (const e of errors) console.error(`  - ${e}`);
console.error('\nFix the fields above, then re-run. Nothing ships until this passes.');
process.exit(1);
