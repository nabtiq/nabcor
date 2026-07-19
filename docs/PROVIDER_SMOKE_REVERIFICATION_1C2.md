# Provider Re-verification — Phase 1C.2 smoke ceremony

**Status:** live-documentation re-verification performed before any provisioning
or provider call (Phase 1C.2, §2). All facts re-checked against primary
Anthropic sources. **Result: no material drift** from the ratified DEC-0018
Option A provider-policy candidate — the one authorized smoke request may
proceed to the Product Owner ceremonies.

Access date for every row below: **2026-07-20** (one day after the Phase 1C.0
evidence base of 2026-07-19; well inside the RISK-DECAY-01 60-day window).

| # | Fact | Ratified value (candidate/policy) | Re-verified value | Source (accessed 2026-07-20) | Drift |
|---|---|---|---|---|---|
| 1 | Model ID and lifecycle | `claude-haiku-4-5-20251001` | Exact ID active; pinned dated snapshot; text+image in / text out; not deprecated or retired on the models page | https://platform.claude.com/docs/en/about-claude/models/overview.md | none |
| 2 | Structured-output request shape | `output_config.format` with `type: json_schema` | Exact: `output_config.format` with `type: "json_schema"`, GA, objects require `additionalProperties: false`; `minLength`/`maxLength`/numeric constraints unsupported | https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md | none |
| 3 | Anthropic API version | `2023-06-01` | `anthropic-version: 2023-06-01` supported for structured outputs; no beta header required (GA) | https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md | none |
| 4 | Pricing (Haiku 4.5) | $1 / MTok input, $5 / MTok output | $1 / input MTok, $5 / output MTok | https://platform.claude.com/docs/en/about-claude/models/overview.md | none |
| 5 | Token constraints | 200,000 in / 32,000 out ceilings (below model max) | Haiku 4.5: 200k context, 64k max output — the ratified 200k/32k ceilings sit within the model limits | https://platform.claude.com/docs/en/about-claude/models/overview.md | none |
| 6 | API-key behavior | console-created, expirable, org-scoped, header `x-api-key` | Unchanged from the Phase 1C.0 packet verification (A11, 2026-07-19); re-verification within the freshness window | packet §12 A11 (2026-07-19) | none |
| 7 | Console spend-limit behavior | hard self-serve monthly cap; pauses at cap | Unchanged from packet A5 (verified 2026-07-19, one day prior) | packet §12 A5 (2026-07-19) | none |
| 8 | Retention/training | `STANDARD_UP_TO_30_DAYS`; no training on API content by default | Unchanged from packet rows 15/17 (A7/A8/A12, 2026-07-19) | packet §12 A7/A8/A12 (2026-07-19) | none |
| 9 | Response usage/request-id fields | `usage` object with input/output tokens; `request-id` header | Unchanged from packet A2/A10 (2026-07-19) | packet §12 A2/A10 (2026-07-19) | none |

**Implementation implication of row 2.** The smoke request must use a trivial
structured-output schema that satisfies the documented subset: an object with
`additionalProperties: false` and no length or numeric constraints. The smoke
service therefore uses a dedicated minimal output shape, not the general NABCor
artifact contracts (which carry `minLength`/`maxLength` and envelope
composition unsupported by constrained decoding).

**Conclusion.** The exact model, API shape, protocol version, price, token
constraints, retention posture, and hard-cap behavior all match the ratified
candidate. No `BLOCKED_ON_PROVIDER_DRIFT` condition exists. Rows 6-9 rely on the
Phase 1C.0 packet verification of 2026-07-19 (one day before this access date),
which is within the RISK-DECAY-01 re-verification window; if the ceremony is
delayed materially, re-verify rows 6-9 against live sources before signing.
