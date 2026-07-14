import { generateLlmsTxt } from '@nabcor/core';
import { content } from '@/content/novalt';

export const dynamic = 'force-static';

/** /llms.txt — generated from the content schema so it never drifts. */
export function GET() {
  return new Response(generateLlmsTxt(content, content.defaultLocale), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
