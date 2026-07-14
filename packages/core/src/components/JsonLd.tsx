/**
 * Renders Schema.org JSON-LD. Ported verbatim from josouralazl (audit found it
 * already correct). Data is developer-authored (never user input); "<" is
 * escaped so no markup can break out of the <script> element. This is the
 * standard, safe way to emit structured data in React — do not rewrite it.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
