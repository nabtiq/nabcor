// Bounded deterministic injection-warning scanner (INV-SEC-002).
//
// This is a heuristic for OBVIOUS seeded instruction attacks only. It does not —
// and cannot — detect every prompt-injection technique; its job is DETECTION and
// FLAGGING: it marks the blatant cases deterministically so they are surfaced,
// never obeyed. It does not itself quarantine anything — the capture layer
// (classify-input + content store) places flagged inline content in the
// quarantine namespace, and the compiler enforces the release boundary.
// Content is always treated as data regardless of the scan result.

const SCAN_LIMIT_CHARS = 65_536;

const PATTERNS: { id: string; re: RegExp }[] = [
  { id: "ignore-previous-instructions", re: /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|rules?)/i },
  { id: "disregard-previous", re: /disregard\s+(?:the\s+|all\s+)?(?:previous|prior|above|earlier)/i },
  { id: "override-instructions", re: /override\s+(?:the\s+)?(?:system|safety|security|previous)\s+(?:prompt|instructions?|rules?)/i },
  { id: "you-are-now", re: /you\s+are\s+now\s+(?:a|an|in|the)\b/i },
  { id: "pretend-persona", re: /pretend\s+(?:to\s+be|you\s+are)\b/i },
  { id: "reveal-system-prompt", re: /reveal\s+(?:your|the)\s+(?:system|hidden)\s+(?:prompt|instructions?)/i },
  { id: "system-prompt-marker", re: /<\s*\/?\s*system\s*>|\bBEGIN\s+(?:SYSTEM|ADMIN)\s+(?:PROMPT|MESSAGE)\b/i },
  { id: "new-instructions-marker", re: /\bnew\s+instructions?\s*:/i },
];

export interface InjectionScanResult {
  flagged: boolean;
  matches: { id: string; index: number }[];
  note: string | null;
}

export function scanForInjection(text: string): InjectionScanResult {
  const bounded = text.slice(0, SCAN_LIMIT_CHARS);
  const matches: { id: string; index: number }[] = [];
  for (const { id, re } of PATTERNS) {
    const m = re.exec(bounded);
    if (m) matches.push({ id, index: m.index });
  }
  if (matches.length === 0) return { flagged: false, matches, note: null };
  const ids = matches.map((m) => `${m.id}@${m.index}`).join(", ");
  return {
    flagged: true,
    matches,
    note:
      `deterministic heuristic matched instruction-like patterns (${ids}); ` +
      `content flagged and treated as data, never obeyed (INV-SEC-002); ` +
      `captured inline content is stored only in the quarantine namespace. ` +
      `This scanner catches obvious seeded attacks only, not every injection technique.`,
  };
}
