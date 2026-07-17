# Rubric — AI-Generic Appearance (G8)

**Used by:** evaluate-genericity, EXP-0003. **Authority:** EXPERIMENTAL.
Verdict: `distinctive | leaning-generic | generic`, with named findings.

**Deterministic fingerprints (checked first):** known-default palettes (purple-gradient
-on-white families, default violet/indigo ramps); default type stacks (Inter/system-ui
as display with no rationale); layout clichés list (centered-hero + 3-card grid + logo
strip with no variation); stock-style imagery markers. Each fingerprint hit is a named
finding with location.

**Model judgment anchors:**
- `distinctive` — a specific creative idea is visible and consistently executed; you
  could describe the brand's world in one sentence that wouldn't fit a competitor.
- `leaning-generic` — competent polish, weak idea; some default vocabulary with
  brand-specific execution (BC-001's own noted risk: rounded-card/scrim defaults
  executed with brand-specific hex/gold language).
- `generic` — interchangeable with template output; the idea sentence fails.

**Evidence required:** the one-sentence world description attempt + fingerprint hits +
what would make it distinctive. Calibration: EXP-0003 compares verdicts against blind
human "looks AI-generated" ratings before this rubric can leave EXPERIMENTAL.
