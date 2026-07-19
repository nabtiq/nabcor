# Provider Enablement Decision Packet

**Status:** research packet for proposed DEC-0018 (Phase 1C.0;
corrected by Phase 1C.0.1 — see
docs/PROVIDER_PACKET_CORRECTION_LEDGER_1C0_1.md for every corrected
statement and its evidence; the recommendation was RECOMPUTED from the
corrected evidence via the weighted model in §5b, not defended in
advance).
**No provider is enabled.** DEC-0009 (zero-provider offline policy) remains
the active, ratified posture; the active gateway policy is unchanged and
CI-guarded (`scripts/validate-provider-packet.mjs`). This packet grants no
authority: it exists so the Product Owner can ratify exactly one option in
DEC-0018 without further architecture research. Merging this document
changes nothing at runtime.

**Evidence discipline.** Every provider fact below carries a status tag —
VERIFIED (read on the named official page on the access date), INFERRED
(derived from official text, derivation stated), UNKNOWN (official
documentation ambiguous, silent, or unreachable), or REQUIRES CONTRACT
(available only under enterprise/negotiated agreement) — and a source in
§12. Research used official provider documentation only, fetched on
2026-07-19; no API calls were made and no accounts were created.
Consumer subscriptions (Claude Pro/Max, ChatGPT plans, Google consumer
plans) are DIFFERENT PRODUCTS from the APIs evaluated here and none of
their terms are generalized to the API products. "Not used for training"
is never treated as "not retained" — the two are reported separately
throughout. **All monetary values in this packet are ESTIMATES** derived
from official published prices and repository workload assumptions; no
cost in this phase is measured.

---

## 1. The ten decision questions (answers summarized)

1. **First provider:** Anthropic API (recommendation §10, Option A;
   runner-up analysis in §5 and Option B).
2. **Initial models:** exactly two pinned IDs — `claude-haiku-4-5-20251001`
   (inexpensive structured extraction/classification, capability Tier 1)
   and `claude-sonnet-5` (general structured generation, capability
   Tier 2). No aliases, no other IDs.
3. **Data classes:** `synthetic` only — unchanged from DEC-0009. Real
   client data remains prohibited regardless of provider training policy.
4. **Retention/training:** Anthropic does not train on API content by
   default (VERIFIED, Commercial Terms); default retention is at most a
   30-day deletion window with the current docs stating no default
   retention for standard Messages calls (reconciliation UNKNOWN — §5
   row 17); trust-and-safety flags can extend retention up to 2 years.
   Acceptable for synthetic-only data; NOT accepted for client data
   (which stays frozen anyway).
5. **Constraints:** first-party Anthropic API offers US/global inference
   only (no EU residency) — irrelevant for synthetic fixtures, recorded
   for the future client-data decision. No contract is required for the
   proposed scope; ZDR and SSO would REQUIRE CONTRACT later.
6. **Secrets:** macOS Keychain locally, GitHub Actions encrypted secrets
   for CI (with NO provider key in CI by default), managed secret service
   for future production (§8).
7. **Spend ceilings:** per-request $1.00 · per-run $25 · per-day $40 ·
   per-month $60, with the provider-console hard monthly cap set to $60
   (§6.4).
8. **Human gates:** provider enablement itself, every model/ceiling/
   data-class change, and EXP-0001 execution each require authenticated
   Product Owner approval via the future `provider-enablement-approval`
   target (§9); the frozen DEC-0008 independent-review gates stay frozen.
9. **Controls:** metering before invocation, truthful run records,
   redaction before persistence, reconciliation against the provider
   usage export, and the layered emergency-disable path E1
   (docs/PROVIDER_ENABLEMENT_THREAT_MODEL.md §6).
10. **Evidence before EXP-0001:** every HIGH-threat implementation gate in
    the threat model test-proven; the adapter merged behind a ratified
    policy revision; the cost model's ceilings configured; a dry
    reconciliation drill on a minimal paid smoke call within the
    per-request ceiling.

## 2. Why now, and what this phase is not

Phase 1B closed the offline foundation: deterministic truth kernel,
authenticated human gates, applied fact resolution, and a safe operator
CLI. Phase 1's remaining exit evidence (EXP-0001) requires a real model
behind the gateway, which DEC-0009 prohibits until a ratified decision
meets its nine requirements. This packet is that decision's evidence
base. This phase implements nothing: no adapter, no SDK, no credential,
no network path, no policy change, no EXP-0001 execution.

## 3. Candidates evaluated

Three first-party API products (aggregators such as OpenRouter were
excluded from first-provider consideration: they add a second trust,
retention, routing, and billing layer on top of a model provider, and no
official evidence suggests that layer's benefits — multi-provider
routing, unified billing — matter for a single-provider synthetic
experiment; they can be revisited if multi-provider needs ever arise):

- **Anthropic API** (api.anthropic.com pay-as-you-go; docs at
  platform.claude.com)
- **OpenAI API** (platform product; docs at developers.openai.com)
- **Google Gemini Developer API** (ai.google.dev, paid tier; Vertex
  AI / "Gemini Enterprise Agent Platform" noted as its enterprise
  variant where materially different)

## 4. Candidate model IDs

| Need | Anthropic | OpenAI | Google |
|---|---|---|---|
| (a) inexpensive structured extraction/classification | `claude-haiku-4-5-20251001` (200k ctx, 64k out) [VERIFIED] | `gpt-5.4-nano-2026-03-17` (400k ctx, 128k out) [VERIFIED] | `gemini-3.1-flash-lite` (1,048,576 ctx, 65,536 out) [VERIFIED] |
| (b) general structured generation | `claude-sonnet-5` (1M ctx, 128k out; dateless pinned snapshot) [VERIFIED] | `gpt-5.6-terra` or `gpt-5.6-luna` (1,050,000 ctx, 128k out) [VERIFIED] | `gemini-3.5-flash` (1,048,576 ctx, 65,536 out) [VERIFIED] |

Google's GA "Pro" successor does not currently exist
(`gemini-3.1-pro-preview` is preview-only) [VERIFIED]; the entire
`gemini-2.5-*` family has an announced shutdown of 2026-10-16 [VERIFIED]
and is excluded from candidacy.

## 5. Comparison matrix

Statuses: [V]=VERIFIED · [I]=INFERRED · [U]=UNKNOWN · [RC]=REQUIRES
CONTRACT. Sources by number in §12. Prices USD per million tokens.

| # | Criterion | Anthropic API | OpenAI API | Google Gemini Developer API |
|---|---|---|---|---|
| 1 | API product evaluated | First-party Messages API, pay-as-you-go [V, A1] | Platform API (Responses recommended; Chat Completions supported) [V, O9] | Gemini Developer API paid tier (Interactions API new default; `generateContent` legacy-but-supported) [V, G14] |
| 2 | Candidate model IDs | `claude-haiku-4-5-20251001`, `claude-sonnet-5` [V, A1] | `gpt-5.4-nano-2026-03-17`, `gpt-5.6-terra`/`gpt-5.6-luna` [V, O1] | `gemini-3.1-flash-lite`, `gemini-3.5-flash` [V, G1] |
| 3 | Model lifecycle/stability | Pinned snapshots (dateless from 4.6 on); >=60 days retirement notice; ~annual migration cadence; Haiku 4.5 retires "not sooner than 2026-10-15", Sonnet 5 "not sooner than 2027-06-30" [V, A9] | Dated snapshots + rolling aliases; >=6 months GA notice (best of the three) [V, O15] | stable/preview/latest tiers; `-latest` hot-swaps with 2-week notice; ~annual shutdowns; 2.5 family dies 2026-10-16 [V, G16] |
| 4 | Structured JSON/schema enforcement | GUARANTEED via constrained decoding (`output_config.format` json_schema, or strict tool use), incl. on Haiku 4.5; schema subset limits [V, A4] | GUARANTEED strict json_schema on gpt-4o+ incl. 5.4-nano; refusals programmatically detectable [V, O5] | Syntactically valid JSON only — docs instruct "always validate values"; NOT semantically guaranteed; `validated` tool mode is Preview [V, G9] |
| 5 | Tool calling disableable | Yes — omit `tools` (0 overhead tokens); `tool_choice: none` [V, A2/A4] | Yes — `tool_choice: "none"` [V, O6] | Yes — `tool_choice: none` ("Model is prohibited from making function calls") [V, G10] |
| 6 | Text/vision capabilities | Text+image in, text out on both candidates [V, A1] | Text+vision on 5.6/5.4 families [V, O1] | Text+multimodal on both candidates [V, G1] |
| 7 | Context limits | 200k (Haiku) / 1M (Sonnet 5); no long-context surcharge [V, A1/A2] | 400k (nano) / 1,050k (5.6) [V, O1] | 1,048,576 both [V, G1] |
| 8 | Input/output pricing | Haiku $1/$5; Sonnet 5 $2/$10 intro through 2026-08-31, then $3/$15 [V, A2] | nano $0.20/$1.25; terra $2.50/$15; luna $1/$6 [V, O3] | flash-lite $0.25/$1.50; 3.5-flash $1.50/$9 [V, G5] |
| 9 | Cached-input / cache-write pricing | Read 0.1x input; write 1.25x (5m) / 2x (1h) [V, A3] | Cached input 10% of input; cache write 1.25x on 5.6+ (free before) [V, O4] | Cached ~10% of input + storage $1.00/1M tok/hr; Interactions API implicit-only, "no cost saving guarantee" [V, G7/G8] |
| 10 | Batch pricing | 50% off input+output; stacks with caching [V, A2] | 50% off [V, O10] | 50% off [V, G5] |
| 11 | Token-usage reporting | `usage` object incl. cache classes + inference_geo [V, A2/A3] | `usage` incl. cached and cache-write tokens [V, O4] | `usageMetadata` incl. cached + thoughts tokens [V, G21] |
| 12 | Request IDs / auditability | `request-id` header; Usage & Cost Admin API; console CSV export; Activity Feed [V, A10/A11] | `x-request-id`; org Usage & Costs API; audit-log API [V, O13/O17] | `responseId` + `modelVersion`; AI Studio usage dashboard; optional 7-55-day request logs [V, G21/G13] |
| 13 | Rate limits (new org) | Start tier: 1,000 RPM / 2M input TPM / 400k output TPM per candidate model; cache reads exempt from ITPM [V, A5] | Tiered by cumulative spend (Tier 1 at $5 paid); RPM/TPM/RPD headers [V, O11] | Tiered (T1 on billing link); per-model RPM/TPM/RPD in dashboard [V, G11] |
| 14 | Timeout/retry guidance | 429 + retry-after; token-bucket; SDK default 2 retries [V, A5/A15] | SDK auto-retry 2x with backoff; 10-min default timeout [V, O18] | Standard Google API guidance; SDK GA [V, G18] |
| 15 | Training on API data by default | NO — "may not train models on Customer Content" (Commercial Terms 2025-06-17); opt-in exceptions only [V, A7/A13] | NO — "not used to train ... unless you explicitly opt in" [V, O7] | Paid tier NO ("doesn't use your prompts ... to improve our products"); FREE TIER YES ("uses the content ... to improve") — tiers must never be mixed [V, G6] |
| 16 | Abuse-monitoring retention | Flagged content up to 2 years (applies even under ZDR); T&S scores up to 7 years [V, A8/A12] | Abuse logs up to 30 days ("unless longer ... required by law") [V, O7] | Exists ("a limited period of time"); duration unpublished on terms AND the ZDR page [V existence / U duration, G6/G26]; ZDR-approved projects get logs SANITIZED before writing [V, G26] |
| 17 | Default retention | CONSERVATIVE operative default: inputs/outputs automatically deleted from the backend within 30 days of receipt/generation, with listed exceptions (longer-lived services, agreed ZDR, Usage Policy enforcement, legal) [V, A12]; the docs page's "not retained by default" is feature-level language that itself defers to the commercial policy [V, A8] — corrected in ledger C4/C5: request-STATE statelessness is never a retention claim. `claude-fable-5` REQUIRES 30-day retention and is ZDR-ineligible — excluded from candidacy [V, A8] | Responses API STORES response objects 30 days BY DEFAULT (`store` must be explicitly false) [V, O8]; Chat Completions application-state retention "None, see below for exceptions" but the Chat `store` parameter default is UNKNOWN on reachable pages [V/U, O7]; abuse logs separate | Interactions API stores 55 days BY DEFAULT (paid; `store=false` available) [V, G14]; optional project logs 7-55 days [V, G13]; abuse logging on top with unpublished duration [U, G26] |
| 18 | Zero/configurable retention | ZDR exists, org-level, NEGOTIATED-CONTRACT ("contact the Anthropic sales team"); Messages/caching/structured-outputs eligible (schema cached ≤24h "qualified"); Batch/Files/code-exec ineligible; flagged content retained up to 2 years EVEN under ZDR [V, A8] | ZDR + Modified Abuse Monitoring exist, PROJECT-APPROVAL via sales ("subject to prior approval ... and acceptance of additional requirements"), org- and project-level controls; `store` forced false under ZDR [V, O7] | **CORRECTED (ledger C1-C3):** the Developer API HAS a documented conditional ZDR: PROJECT-APPROVAL sanitizes abuse logs before writing ("zero identifiable user data") PLUS self-serve restrictions — `store=false`, no Search/Maps grounding, no retained Files, no explicit caching, no Live session resumption; implicit in-RAM caching (24h TTL) is explicitly ZDR-compatible; request MECHANISM undocumented [V conditions / U mechanism, G26]. Vertex/GEAP ZDR separately per approval [V, G22] |
| 19 | Regional processing/residency | `inference_geo`: `global` or `us` only (1.1x for us); workspace geo us-only; NO EU option first-party [V, A6] | US/EU/UK/+7 regions; regional processing for US/EU/UAE; most regions gated on ZDR/Modified-Abuse approval [V/RC, O7] | Developer API: none ("any country ... facilities"); Vertex/GEAP: regional endpoints with in-region guarantee [V, G6/G15/G23] |
| 20 | Subprocessors disclosure | List exists at trust.anthropic.com/subprocessors; content not machine-readable on access date [U content, A17] | List exists; pages returned HTTP 403 on access date [U content, O20] | Google Cloud subprocessor framework; Developer-API-specific list not found [U, G25] |
| 21 | Security/compliance evidence | SOC 2 Type I+II, ISO 27001:2022, ISO 42001:2023, HIPAA-ready w/ partially self-serve BAA (commercial products incl. API) [V, A14] | SOC 2/3, ISO 27001/27017/27018/27701/42001, FedRAMP 20x, PCI (trust portal); BAA sales-gated [V portal / RC details, O19] | Developer API audit scope: NOT confirmed on any official page found [U, G25]; Vertex/GEAP inherits Google Cloud programs [V program-level / I service-scope, G25] |
| 22 | Secret-management expectations | API keys console-created, expirable, org-scoped; Admin API can deactivate; Workload Identity Federation for keyless CI [V, A11] | Project-scoped keys; admin keys separate; audit-log API [V, O13] | Keys bound to Cloud project; IP/app restrictions; service-account-bound keys with leaked-key enforcement; Secret Manager recommended [V, G20] |
| 23 | TS/Node integration | Official `@anthropic-ai/sdk` (Node 20+); raw HTTPS fully documented (cURL examples throughout) [V, A15] | Official `openai` (Node 20+); raw HTTPS + OpenAPI spec [V, O18] | Official `@google/genai` GA; REST documented; old SDK deprecated 2025-11-30 [V, G18] |
| 24 | Provider-side storage/memory controls | No request-state storage on standard Messages (no store flag or conversation objects to manage — a state-semantics property, NOT a retention claim; see row 17); Files/Batch/code-exec/Skills/MCP all opt-in per request [V, A8/A13] | Responses NOT stateless by default: `store:false` required per request; Conversation objects persist until deleted; Chat `store` default UNKNOWN [V/U, O8/O7] | NOT stateless by default: Interactions `store=true` default (55 days); Files auto-delete 48h; legacy generateContent + the ZDR restriction bundle is the zero-footprint recipe [V, G14/G19/G26] |
| 25 | Spend-cap controls | HARD self-serve monthly caps (Start tier $500 ceiling; self-set lower limit; "usage pauses until the next month") + per-workspace spend limits [V, A5] | Org/project monthly budgets are tied to 429 rejections on the official error-codes page ("Your monthly budget is set too low for your organization's usage ... You exceeded your current quota") — hard-stop INFERRED from official text; help-center confirmation unreachable (403); notification thresholds are a separate alerts-only mechanism [I hard-stop / V tiers+alerts, O11/O22] | HARD tier caps ("service is paused ... until the next billing cycle"; Tier 1 $250) + $10/10-min rate cap; caveat: batch/agent long-running work can overrun via ~10-min billing latency [V, G12] |
| 26 | Deprecation/version-pinning risk | Low-medium: pinned snapshots, 60-day floor, published tentative retirement dates [V, A9] | Low: 6-month GA notice, dated snapshots [V, O15] | Medium-high: annual shutdowns, Pro tier currently preview-only, 2.5 family dies mid-experiment-window 2026-10-16 [V, G16] |
| 27 | Expected EXP-0001 cost (expected case, §6) | ≈ $5.80 | ≈ $3.50 | ≈ $2.40 |
| 28 | Unresolved legal/contract questions | Subprocessor list content [U]; SSO [RC]; ZDR terms [RC] (the row-17 retention reconciliation is RESOLVED conservatively — ledger C4) | Help-center hard-cap confirmation (403) [U]; Chat `store` default [U]; subprocessor content (403) [U]; enterprise-privacy page (403) [U]; org ID-verification requirement [U — article 403 on re-check]; BAA/ZDR [PROJECT-APPROVAL/RC] | Developer-API audit scope [U]; abuse-retention duration [U]; ZDR request mechanism [U]; explicit-cache default TTL [U] |
| 29 | Overall fit for NABCor first enablement (recomputed in §5b) | STRONG (4.22/5 baseline): hard caps, no request-state storage, guaranteed schema on cheap tier, no-training default, pinned IDs, raw HTTPS — all VERIFIED self-serve; conservative 30-day deletion default accepted for synthetic scope | MIXED (3.92/5): best GA deprecation notice and low price; budget hard-stop now INFERRED from official 429 wording (not fully verified); storage-by-default on Responses; several 403-blocked governance pages; WINS the cost-dominant sensitivity case | MIXED (3.25/5): verified hard tier caps and the strongest published conditional ZDR (corrected, ledger C1) — recorded as a real asset for FUTURE client-data decisions — but syntactic-only structured output, 55-day stateful default, unpublished abuse-log duration, and fastest model churn dominate for THIS workload |

**Public defaults vs optional controls vs post-approval controls vs
contract-only claims** (required separation): everything labeled [V] with
no [RC] above is public default or self-serve. Controls available only
after provider approval processes: OpenAI regional processing tiers,
Google/Vertex abuse-monitoring exception. Contract-only ([RC]): all three
providers' ZDR; Anthropic SSO and custom BAA; OpenAI BAA/Modified Abuse
Monitoring; any subprocessor/security detail behind gated portals. The
recommended Option A uses ONLY public self-serve capabilities.

## 5b. Recomputed weighted comparison (Phase 1C.0.1)

The recommendation below is DERIVED from this scoring, recomputed from
the corrected evidence — not carried forward from the pre-correction
packet. Scores are 0-5 per criterion; a −1 uncertainty penalty is
applied inside a cell when its deciding fact is INFERRED or UNKNOWN
(noted). Weighted result = Σ(weight × score) / 100. Evidence per cell is
the matrix row cited.

| Criterion (matrix row) | Weight | Anthropic | OpenAI | Google |
|---|---|---|---|---|
| Deterministic structured-output enforcement (4) | 14 | 5 (guaranteed constrained decoding incl. cheap tier) | 5 (guaranteed strict json_schema incl. nano) | 2 (syntactic-only; "always validate values") |
| Spend hard-stop reliability (25) | 12 | 5 (verified pause-at-cap + self-set + workspace) | 3 (= 4 − 1: hard stop INFERRED from official 429 wording, help-center unreachable) | 4 (verified pause-at-cap; − batch-latency overrun caveat) |
| Default retention posture (17) | 8 | 3 (30-day backend deletion default; 2y T&S flags) | 2 (Responses stores by default + 30d abuse logs; Chat default UNKNOWN) | 2 (= 3 − 1: 55-day stateful default; abuse duration UNKNOWN) |
| Attainable ZDR (18) | 4 | 4 (org-level, Messages covered; 2y flag carve-out) | 4 (project/org controls, store forced false) | 4 (= 5 − 1: strongest published abuse-log sanitization, but request mechanism UNKNOWN) |
| ZDR requirements burden (18) | 3 | 1 (negotiated contract) | 2 (prior approval + added requirements) | 3 (project approval + self-serve restriction bundle) |
| Training posture (15) | 8 | 5 (no-training default, Commercial Terms) | 5 (no-training default) | 4 (paid no / FREE TIER TRAINS — tier-mixing hazard) |
| Model stability/lifecycle (3, 26) | 8 | 3 (pinned; 60-day floor; Haiku floor 2026-10-15 schedule pressure) | 5 (≥6-month GA notice; no announced retirements) | 2 (annual churn; GA pro absent; 2.5 family dies 2026-10-16) |
| Price — expected EXP-0001 (27, §6) | 10 | 2 (≈$5.80) | 4 (≈$3.50) | 5 (≈$2.40) |
| Usage reconciliation/auditability (11, 12) | 6 | 5 (usage+cost admin API, request IDs, CSV) | 5 (usage/costs API, request IDs) | 4 (usageMetadata, responseId, dashboard) |
| Secret & emergency-disable controls (22, 25) | 7 | 5 (expirable keys, admin deactivation, console revocation, caps backstop) | 4 (project keys, admin API; cap semantics partially inferred) | 4 (key restrictions, service-account keys, leaked-key enforcement) |
| Raw HTTPS feasibility / zero new deps (23) | 6 | 5 (fully documented) | 5 (documented + OpenAPI spec) | 5 (REST reference documented) |
| Operational complexity / misconfiguration surface (24, 15) | 8 | 5 (no store flag, no tier mixing, no context-tier price split) | 2 (store:false everywhere; long/short-context price scoping; ID-verification UNKNOWN) | 2 (store=false + free/paid split + ZDR bundle + legacy-vs-Interactions split) |
| Synthetic EXP-0001 suitability (4, 27) | 6 | 5 (schema guarantee on the extraction tier — the experiment's failure mode) | 4 | 2 (validation-failure loops land on the metric EXP-0001 budgets) |
| **Weighted result** | **100** | **4.22** | **3.92** | **3.25** |

### Sensitivity analysis

Method: the named criterion (or block) is re-weighted to 40 of 100 and
all remaining weights are scaled proportionally to sum to 60.

| Case (dominant weight 40) | Anthropic | OpenAI | Google | Leader |
|---|---|---|---|---|
| 1. Privacy/ZDR block (rows 17+18 criteria: default retention, attainable ZDR, ZDR burden) | 3.82 | 3.51 | 3.10 | Anthropic |
| 2. Structured-output reliability | 4.46 | 4.25 | 2.87 | Anthropic |
| 3. Cost | **3.48** | **3.95** | **3.83** | **OpenAI** |
| 4. Spend hard-stop reliability | 4.47 | 3.63 | 3.49 | Anthropic |

**The cost-dominant case flips the leader to OpenAI (with Google
second). This is published, not hidden:** a Product Owner whose dominant
criterion is price should ratify Option B. Anthropic leads the baseline
and the other three cases because its weak criteria (price, ZDR burden,
Haiku schedule pressure) carry less combined weight than its verified
strengths (schema guarantee, hard caps, low misconfiguration surface).

**Why Anthropic remains recommended despite Google's corrected ZDR:**
ZDR-class criteria carry little weight in a SYNTHETIC-only phase (7 of
100 combined) — nothing sensitive exists to retain — and even in the
privacy-dominant sensitivity case Anthropic still leads because
Google's 55-day stateful default, unpublished abuse-log duration, and
syntactic-only structured output outweigh its (genuinely strongest)
conditional abuse-log sanitization. Google's corrected ZDR is recorded
as a material asset for the FUTURE real-client-data decision, where the
privacy block would be re-weighted and the comparison re-run.
**Why despite OpenAI's lower cost:** the ~$2.30 expected-case premium
buys the two properties EXP-0001's integrity depends on most — a
verified (not inferred) spend hard stop and guaranteed schema adherence
with no storage-by-default footgun; at a $25 run ceiling the absolute
premium is small, and Option B remains fully specified for a
price-dominant ratification.

## 6. Cost model for EXP-0001 (estimates only)

### 6.1 Workload assumptions (from the repository, stated explicitly)

- EXP-0001 runs 7 benchmark cases; the experiment plan budgets 40-75k
  OUTPUT tokens per case, 300-520k total
  (brain/experiments/EXP-0001-prompt-to-brand-context.md).
- Input tokens are not budgeted in the plan; assumption: 30k (low) /
  80k (expected) / 150k (hard-ceiling) fresh input tokens per case
  (benchmark bundles are small-to-medium synthetic documents; the
  60MB-PDF class of BC-001 is NOT in these cases).
- Work split assumption (expected case): 60% of tokens on the Tier-1
  extraction model, 40% on the Tier-2 generation model, per the
  lowest-sufficient-tier rule (docs/MODEL_AND_TOKEN_STRATEGY.md §2).
- Anthropic tokenizer note: Sonnet 5 uses a tokenizer producing ~30% more
  tokens for the same text than Haiku 4.5's [V, A1]; the expected case
  inflates Sonnet-side token counts by 1.3x to absorb this.
- **No caching savings are claimed.** The 7 cases are distinct content;
  Haiku 4.5's minimum cacheable prefix is 4,096 tokens [V, A3] and the
  shared system prompt is not assumed to reach it. All input is priced
  uncached. (Formulas below still show the cache terms for the future.)
- Conservative pricing: Sonnet 5 is priced at its POST-INTRO rate
  ($3/$15, effective 2026-09-01) even though the intro rate ($2/$10)
  runs through 2026-08-31 [V, A2] — the experiment date is not fixed.
- Batch API is NOT assumed (it would halve prices but adds a 29-day
  retention surface [V, A8] and latency; a later optimization decision).

### 6.2 Formulas

For each model m with prices P_in, P_cache_read, P_cache_write_5m, P_out
(USD per million tokens):

```
cost(m) = uncached_in/1e6 * P_in
        + cached_in/1e6   * P_cache_read      (0 in all scenarios below)
        + cache_writes/1e6 * P_cache_write_5m (0 in all scenarios below)
        + output/1e6      * P_out
run_cost = sum over models + retry_reserve
```

Tool calls: none (tools are omitted entirely; 0 overhead tokens [V, A2]).
Taxes/fees: provider list prices exclude taxes; whether VAT/GST applies
depends on the billing country and is UNKNOWN. Headroom against it is
uneven by design: the daily ($40) and monthly ($60) ceilings carry
roughly 25-60% headroom over their driving scenarios, while the $25 run
ceiling sits only ~2% above the hard-ceiling scenario — if a ~20% tax
applies, a genuine hard-ceiling run would breach it and must either
split across days or trigger a ceiling re-ratification; that is the
conservative failure mode, chosen deliberately. Currency: USD.
Rounding: enforcement rounds per-request costs UP to the cent and
scenario totals UP to the nearest $0.10; displayed intermediate values
in §6.3 use standard cent rounding for readability (totals remain
round-up).

### 6.3 Scenarios (Anthropic candidates; Haiku=$1/$5, Sonnet post-intro=$3/$15)

| Scenario | Assumptions | Arithmetic | Estimate |
|---|---|---|---|
| Low | 7 cases all-Haiku; 30k in / 40k out per case | in 210k*$1 + out 280k*$5 = $0.21 + $1.40 | **≈ $1.70** |
| Expected | 7 cases; 80k in / 60k out per case; 60/40 Haiku/Sonnet split; Sonnet tokens x1.3 | Haiku: 336k in*$1 + 252k out*$5 = $1.60; Sonnet: 224k*1.3 in*$3 + 168k*1.3 out*$15 = $0.87 + $3.28 | **≈ $5.80** |
| Hard ceiling | all-Sonnet; 150k in per case; output at the experiment's 2x-budget fail line (1.04M total); x1.3 tokenizer | in 1.05M*1.3*$3 = $4.10; out 1.04M*1.3*$15 = $20.28 | **≈ $24.40** |
| One retry | Expected + one full case retried on Sonnet (150k in / 75k out, x1.3) | + $0.59 + $1.46 | **≈ $7.90** |
| One structured-output validation failure | Expected + one wasted full-case output (75k*1.3 at $15) + bounded re-issue (same size) | + $1.46 wasted + $2.05 reissue | **≈ $9.40** |
| One bounded escalation | Expected + one case's tokens moved Haiku→Sonnet (80k in, 60k out, x1.3 delta) | + in 80k*(1.3*$3-$1) + out 60k*(1.3*$15-$5) = $0.23 + $0.87 | **≈ $6.90** |

Cross-checks (expected-case arithmetic on the same token assumptions —
560k in / 420k out, 60/40 split, no tokenizer inflation applied to
non-Anthropic models because their tokenizer ratios for this workload
are unknown): OpenAI `gpt-5.4-nano`+`gpt-5.6-terra`: 0.336M*$0.20 +
0.252M*$1.25 + 0.224M*$2.50 + 0.168M*$15 = $3.47 → **≈ $3.50**; Google
`gemini-3.1-flash-lite`+`gemini-3.5-flash`: $0.47 + $1.85 = $2.31 →
**≈ $2.40**. Price alone would favor Google or OpenAI's small tier; §10
explains why the recommendation weighs the control surface higher.

### 6.4 Proposed ceilings (initial provider phase, synthetic EXP-0001 only)

| Ceiling | Value | Rationale |
|---|---|---|
| Max USD per request | $1.00 | > any single expected request (worst request ≈ 150k in + 32k out Sonnet ≈ $1.21 rounds into two requests; cap forces chunking) |
| Max USD per workflow run | $25 | hard-ceiling scenario ($24.40) rounded up |
| Max USD per day | $40 | one hard-ceiling run + one expected re-run + reserve |
| Max USD per month | $60 | two full experiment cycles + anomaly headroom; ALSO set as the provider-console hard cap [V, A5] |
| Max input tokens per request | 200,000 | Haiku's full window; Sonnet requests stay within it by policy |
| Max output tokens per request | 32,000 | half of Haiku's 64k max output; forces bounded chunks |
| Max attempts per request | 2 (one retry) | threat T14 |
| (interaction rule) | pre-invocation cost metering governs: a request whose projected cost exceeds the $1.00 cap must be chunked even when it fits both token maxima (200k in + 32k out on Sonnet projects to ≈$1.40) | §1.9 metering; keeps the USD cap authoritative |
| Max escalations per run | 7 (one per case), each consuming the case's escalation reserve exactly once | MODEL_AND_TOKEN_STRATEGY §2 rule |
| Emergency-disable threshold | any day > $40, any reconciliation divergence > 20%, or any leakage-scan failure | threat model E1 |

## 7. Threat model

See docs/PROVIDER_ENABLEMENT_THREAT_MODEL.md — 21 threat entries
(T01-T21) covering all 24 required threat categories (T06, T16, and T19
each cover two adjacent categories), each with asset, attack, preventive
control, detective control, response, residual risk, implementation
gate, and owner, plus the layered emergency-disable path E1 (provider-console key revocation →
local secret removal → policy-revision revert → console spend cap). The
recommendation below is conditional on every HIGH-threat implementation
gate being test-proven in the implementation phase before the first paid
request.

## 8. Secret-management design (design only — nothing installed here)

Rules (all enforced by the implementation phase, several already enforced
today): no secret in Git, JSON artifacts, fixtures, Second Brain, logs,
manifests, model-run records, CLI history examples, or PR content; no
secret through ordinary command-line arguments; environment variables are
process-injection plumbing only, never the canonical store; per-provider
least-privilege credentials (a standard API key scoped to one workspace,
never an admin key, with a console expiration date [V, A11]); documented
rotation (quarterly + on suspicion) and revocation (console, immediate);
emergency disable without code deployment (E1); tests use fake
credentials and mocked transport only; provider errors redacted before
persistence; credential-shaped scanning stays blocking.

| Store | Role | Assessment |
|---|---|---|
| macOS Keychain (`security` CLI / Keychain Access) | Product Owner local development — the ONLY place the real key lives in this phase | Recommended: OS-encrypted at rest, unlock-scoped, no file in the repo tree, queryable at process spawn to inject an env var into the gateway process only |
| GitHub Actions encrypted secrets | CI | Recommended for the mechanism, BUT: **CI makes no paid/provider calls by default** — no provider key is stored in CI at all in the initial phase; all CI tests run mocked. A CI secret would be added only if a later decision creates a gated, manually-triggered paid smoke workflow |
| Managed secret service (e.g., a cloud secret manager) | Future production | Deferred: required before any multi-host or service deployment; selection is part of the future production-architecture decision, not this packet |

## 9. Approval and gate design (design only)

**Requires authenticated Product Owner approval** (DEC-0014 mechanism,
each via a signed decision-artifact target): enabling the provider
adapter (the DEC-0018 ratification itself, then the policy-revision
commit); any change to allowed model IDs; any spend-ceiling increase;
any data-class change; executing EXP-0001 (one signed approval per
experiment execution); enabling caching or Batch mode (retention
surface); any retention-posture change.

**Structurally prohibited — no signature can grant them in this scope**
(frozen DEC-0008 independent-review gates and/or missing ratified
decisions): real client data to any provider; quarantine release;
client-facing publishing; provider-side storage/memory features;
fallback or additional providers; tools/network/browsing/code-execution
capabilities; fine-tuning or training-dataset upload; cross-brand
context. The Product Owner key is NOT independent-review authority and
nothing here reinterprets it.

**Future signed target: `provider-enablement-approval`** (designed, not
implemented). A new immutable artifact type, `provider-policy-candidate`,
would carry: provider id · exact model-ID allowlist · allowed data
classes · every §6.4 control value (the four USD ceilings, both token
limits, the attempt cap, the escalation cap, and the emergency-disable
threshold) · retention posture (the
documented provider defaults being accepted) · caching/batch stance ·
validity window for the enablement. The Product Owner signs THAT
artifact's exact canonical digest under a new `provider-enablement-
approval` gate (same DEC-0014 mechanics: policy-authorized,
target-digest-bound, nonce-consumed), and the implementation phase's
active-policy revision must embed the signed candidate's digest — so the
running policy is cryptographically traceable to exactly what was
ratified, and any ceiling/model/data-class drift breaks the binding.
Contract, gate-enum extension, and verification wiring are implementation-
phase work under the ratified option.

## 10. Options for the Product Owner

### Option A — Recommended narrow enablement: Anthropic API, two pinned models, synthetic-only

- **Provider/models:** Anthropic API with exactly
  `claude-haiku-4-5-20251001` and `claude-sonnet-5`. No aliases, no
  other IDs, no `claude-fable-5` (its mandatory 30-day retention and
  ZDR-ineligibility [V, A8] contradict the minimal-retention posture).
- **Scope:** synthetic data only; EXP-0001 preparation and execution
  only; ceilings per §6.4; caching and Batch OFF; tools omitted; no
  provider-side storage features; no fallback; console hard cap $60.
- **Benefits:** every load-bearing control is VERIFIED and self-serve —
  hard monthly spend caps and workspace spend limits (verified
  pause-at-cap semantics), no request-state storage on standard
  Messages calls (no store flag or conversation objects to manage — a
  state-semantics property, distinct from the 30-day backend deletion
  default in row 17), GUARANTEED constrained-decoding structured output
  on the cheap tier (EXP-0001 is structured extraction — schema
  adherence failures are its most expensive noise source), no-training
  default under Commercial Terms, pinned model snapshots, request IDs +
  Usage/Cost API for reconciliation, and fully documented raw HTTPS so
  the adapter needs ZERO new runtime dependencies (Node built-in fetch),
  keeping the DEC-0006 dependency boundary intact. No contract, sales
  contact, or identity-verification process is needed for this scope.
  Retention posture accepted knowingly for synthetic data: automatic
  backend deletion within 30 days (exceptions listed in row 17); zero
  retention would require a negotiated ZDR agreement (not pursued in
  this scope).
- **Costs:** expected EXP-0001 ≈ $5.80, ceiling $25/run, $60/month
  (estimates, §6). Mid-priced: ~1.7x OpenAI's expected-case estimate
  (≈$3.50) and ~2.4x Google's (≈$2.40) — an absolute premium of
  roughly $2.30 per expected run, buying the verified control surface
  above.
- **Risks:** Haiku 4.5's tentative retirement floor is 2026-10-15
  [V, A9] — EXP-0001 should run before October or re-ratify the model
  list; retention-doc reconciliation UNKNOWN (row 17) — acceptable for
  synthetic data, must be resolved (likely [RC]) before any client-data
  decision; residual risks per threat model §7. Conflict-of-interest
  note, stated plainly: the agent that assembled this packet runs on
  Anthropic models. Every determinative fact is independently sourced
  and tagged, the matrix supports overriding the recommendation, and
  Option B exists precisely so the Product Owner can prefer the cheaper
  candidate on the same evidence.
- **Reversibility:** high — key revocation kills it in minutes (E1);
  policy revert restores DEC-0009 posture; no data leaves beyond
  synthetic fixtures.
- **Work enabled:** provider-adapter implementation phase; EXP-0001
  execution (after its own gates); Phase 1 exit evidence.
- **Still prohibited:** everything in §9's structural list.
- **Active-policy changes a later implementation would require:**
  `allowed_adapters: ["anthropic"]` (adapter id per implementation);
  `api_credentials_permitted: true`; `external_network_allowed: true`
  (gateway adapter only); spend fields set to §6.4's per-run/monthly
  values; `allowed_data_classes` UNCHANGED at `["synthetic"]`;
  `required_execution_tier` per implementation design; `decision_ref:
  DEC-0018`; plus the new model-allowlist and ceiling fields the policy
  contract migration adds, embedding the signed candidate digest (§9).

### Option B — Cheapest capable configuration: OpenAI API

- **Provider/models:** OpenAI API with `gpt-5.4-nano-2026-03-17`
  (extraction) and `gpt-5.6-terra` (generation), Responses API with
  `store: false` mandated at the adapter layer on every call.
- **Advantage:** lower cost (expected EXP-0001 ≈ $3.50, ~40% cheaper
  than Option A; the all-small-tier floor is lower still); the
  industry's longest GA deprecation notice (>=6 months [V, O15]);
  strict structured outputs also guaranteed [V, O5].
- **Added risks vs A:** storage-by-default on the recommended API — one
  missed `store:false` persists content 30 days provider-side (a
  standing implementation foot-gun A does not have), and the Chat
  Completions `store` default is UNKNOWN on reachable pages; the
  self-set monthly budget hard stop is INFERRED from the official
  error-codes page (429 tied to org/project budgets) but the
  help-center confirmation remains unreachable — Option B's
  implementation phase must verify it empirically before the first
  paid request; org government-ID verification requirement is UNKNOWN
  (article 403 on re-check); subprocessor and enterprise-privacy pages
  were unreachable (403), leaving governance questions open that
  Anthropic's docs answered publicly.
- **Reversibility:** high (same key-revocation logic).
- **Work enabled / still prohibited:** as Option A.
- **Policy changes:** as Option A with provider and model IDs swapped
  (the §6.4 dollar ceilings are provider-neutral and stay identical),
  PLUS a mandatory adapter-enforced `store:false` invariant with a
  leakage test, and a verified answer on hard spend caps before the
  first paid request.

### Option C — Preserve DEC-0009 (status quo)

- **Posture:** fake adapter only, synthetic data only, zero external
  spend; this packet is filed as research.
- **Benefits:** zero new risk surface; zero cost; the offline foundation
  keeps its perfect determinism story.
- **Costs:** Phase 1 cannot produce its exit evidence — EXP-0001 stays
  blocked, and every model-backed capability (extraction, territories,
  evaluation) stays hypothetical; the project's central premise
  (evidence-based creative intelligence) remains unmeasured.
- **Risks:** stagnation risk only; no technical risk.
- **Reversibility:** trivially — ratify A or B later; the packet's
  research will need re-verification (prices and policies drift;
  re-check sources after ~60 days).
- **Work enabled:** none new. **Still prohibited:** all model-backed
  work. **Policy changes:** none.

### Recommendation

**Option A**, as the outcome of the recomputed weighted comparison
(§5b): Anthropic leads the baseline (4.22 vs 3.92 vs 3.25) and three of
the four sensitivity cases; OpenAI leads the cost-dominant case and a
price-dominant Product Owner should ratify Option B. The decisive
properties are the ones that fail closed: VERIFIED pause-at-cap spend
limits, guaranteed schema adherence on the cheap extraction tier, no
request-state storage surface, and zero new runtime dependencies —
while the accepted costs are stated plainly: a ~$2.30 expected-case
premium, a conservative 30-day backend deletion default (row 17), and
Haiku 4.5's 2026-10-15 retirement floor. No dedicated Google option
exists because on the corrected evidence it still scores lowest for
THIS workload (§5b: syntactic-only structured output, 55-day stateful
default, unpublished abuse-log duration, fastest churn) even though its
corrected conditional ZDR (ledger C1) is the strongest published
abuse-log posture of the three and is explicitly recorded as an asset
for the future real-client-data decision.

### Product Owner ratification statement (copy verbatim; the option letter is the only edit)

> I, Ibrahim Mohamed (@ibra2000sd), Product Owner of NABCor, ratify
> DEC-0018 Option ___ as written in
> docs/PROVIDER_ENABLEMENT_DECISION_PACKET.md at the Phase 1C.0 merge
> commit of the nabtiq/nabcor repository, with self_review: true under
> DEC-0008. This ratification authorizes only the work the selected
> option enables, under every safety posture, ceiling, gate, and
> exclusion recorded in the packet and in DEC-0018: for Options A or B,
> the provider-enablement IMPLEMENTATION phase only; for Option C, the
> unchanged preservation of DEC-0009 with no provider work authorized.
> It does not itself enable a provider, execute EXP-0001, permit real
> client data, or unfreeze any independent-review gate.

## 11. What must be true before EXP-0001 runs (evidence checklist)

1. DEC-0018 ratified with one option, recorded with approval evidence.
2. Implementation phase merged: adapter behind the gateway, policy
   revision embedding the signed candidate digest (§9), every HIGH-threat
   gate from the threat model test-proven (mocked transport), leakage
   and dependency scans extended and green.
3. Secrets provisioned per §8; console hard cap set to $60; ceilings
   configured and enforced pre-invocation.
4. One minimal paid smoke call within the per-request ceiling, followed
   by a successful reconciliation of run records vs the provider usage
   export.
5. A signed EXP-0001 execution approval (§9).
6. EXP-0001's own experiment plan unchanged: 7 cases, metrics, pass/fail
   criteria — results land in its Result section only from real runs.

## 12. Sources

All accessed 2026-07-19. Every entry lists the decision question(s) it
supports (matrix row numbers from §5).

**Anthropic (A):**
- A1. Models overview — https://platform.claude.com/docs/en/about-claude/models/overview.md — Accessed 2026-07-19 — rows 2,3,6,7; tokenizer note.
- A2. Pricing — https://platform.claude.com/docs/en/about-claude/pricing.md — Accessed 2026-07-19 — rows 5,7,8,10,11; tool-overhead facts.
- A3. Prompt caching — https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md — Accessed 2026-07-19 — rows 9,11; §6.1 minimum-prefix.
- A4. Structured outputs — https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md — Accessed 2026-07-19 — rows 4,5.
- A5. Rate limits — https://platform.claude.com/docs/en/api/rate-limits.md — Accessed 2026-07-19 — rows 13,25; §6.4 console cap.
- A6. Data residency — https://platform.claude.com/docs/en/manage-claude/data-residency.md — Accessed 2026-07-19 — row 19.
- A7. Commercial Terms of Service (effective 2025-06-17) — https://www.anthropic.com/legal/commercial-terms — Accessed 2026-07-19 — row 15.
- A8. API and data retention — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention.md — Accessed 2026-07-19 — rows 16,17,18,24; Fable-5 exclusion.
- A9. Model deprecations — https://platform.claude.com/docs/en/about-claude/model-deprecations.md — Accessed 2026-07-19 — rows 3,26; Option A retirement risk.
- A10. Usage and Cost API — https://platform.claude.com/docs/en/manage-claude/usage-cost-api.md — Accessed 2026-07-19 — row 12.
- A11. Admin API — https://platform.claude.com/docs/en/manage-claude/admin-api.md — Accessed 2026-07-19 — rows 12,22; §8 key lifecycle.
- A12. "How long do you store my organization's data?" — https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data — Accessed 2026-07-19 — row 17.
- A13. "Is my data used for model training?" — https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training — Accessed 2026-07-19 — row 15.
- A14. "What Certifications has Anthropic obtained?" — https://privacy.claude.com/en/articles/10015870-what-certifications-has-anthropic-obtained — Accessed 2026-07-19 — row 21.
- A15. TypeScript SDK — https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript — Accessed 2026-07-19 — rows 14,23.
- A16. Set up single sign-on — https://support.claude.com/en/articles/13132885-set-up-single-sign-on-sso — Accessed 2026-07-19 — row 28 [RC].
- A17. Trust Center — https://trust.anthropic.com/ (and /subprocessors) — Accessed 2026-07-19 — rows 20,21; content not machine-readable, marked UNKNOWN.
- A18. Covered Models — https://support.claude.com/en/articles/15425695 — Accessed 2026-07-19 (updated "over 2 weeks ago") — rows 17,18; Covered-Model 30-day retention wording (Phase 1C.0.1 re-verification).

**OpenAI (O):**
- O1. Models — https://developers.openai.com/api/docs/models (+ model cards gpt-5.6-luna, gpt-5.4-nano, gpt-5.4-mini) — Accessed 2026-07-19 — rows 2,3,6,7.
- O2. Model guidance — https://developers.openai.com/api/docs/guides/latest-model — Accessed 2026-07-19 — row 2.
- O3. Pricing — https://developers.openai.com/api/docs/pricing — Accessed 2026-07-19 — rows 8,9,10.
- O4. Prompt caching — https://developers.openai.com/api/docs/guides/prompt-caching — Accessed 2026-07-19 — rows 9,11.
- O5. Structured model outputs — https://developers.openai.com/api/docs/guides/structured-outputs — Accessed 2026-07-19 — row 4.
- O6. Function calling — https://developers.openai.com/api/docs/guides/function-calling — Accessed 2026-07-19 — row 5.
- O7. Data controls in the OpenAI platform — https://developers.openai.com/api/docs/guides/your-data — Accessed 2026-07-19 — rows 15,16,17,18,19.
- O8. Conversation state — https://developers.openai.com/api/docs/guides/conversation-state — Accessed 2026-07-19 — rows 17,24.
- O9. Migrate to Responses — https://developers.openai.com/api/docs/guides/migrate-to-responses — Accessed 2026-07-19 — rows 1,17.
- O10. Batch API — https://developers.openai.com/api/docs/guides/batch — Accessed 2026-07-19 — row 10.
- O11. Rate limits — https://developers.openai.com/api/docs/guides/rate-limits — Accessed 2026-07-19 — rows 13,25.
- O12. Production best practices — https://developers.openai.com/api/docs/guides/production-best-practices — Accessed 2026-07-19 — rows 13,22.
- O13. Admin APIs — https://developers.openai.com/api/docs/guides/admin-apis — Accessed 2026-07-19 — rows 12,22,24.
- O14. (row 24 storage facts also from O8.)
- O15. Deprecations — https://developers.openai.com/api/docs/deprecations — Accessed 2026-07-19 — rows 3,26.
- O16. SDKs and CLI — https://developers.openai.com/api/docs/libraries — Accessed 2026-07-19 — row 23.
- O17. Costs API reference — https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs — Accessed 2026-07-19 — row 12.
- O18. openai-node README — https://github.com/openai/openai-node — Accessed 2026-07-19 — rows 14,23.
- O19. Trust portal — https://trust.openai.com — Accessed 2026-07-19 — row 21.
- O20. Subprocessor list — https://openai.com/policies/sub-processor-list/ — Accessed 2026-07-19 — row 20; HTTP 403, content UNKNOWN.
- O21. Org verification article — https://help.openai.com/en/articles/10910291 — Accessed 2026-07-19 (re-attempted in Phase 1C.0.1, still 403) — row 28; requirement now marked UNKNOWN.
- O22. Error codes — https://developers.openai.com/api/docs/guides/error-codes — Accessed 2026-07-19 — row 25; 429 tied to org/project monthly budgets (hard-stop INFERRED). NOTE: platform.openai.com docs URLs 301-redirect to developers.openai.com (canonical domain).

**Google (G):**
- G1. Models — https://ai.google.dev/gemini-api/docs/models (+ cards gemini-3.5-flash, gemini-3.1-flash-lite, gemini-2.5-flash-lite) — Accessed 2026-07-19 — rows 2,3,6,7.
- G5. Pricing — https://ai.google.dev/gemini-api/docs/pricing — Accessed 2026-07-19 — rows 8,9,10,15 (free-vs-paid data split).
- G6. Additional Terms of Service (updated 2026-04-28) — https://ai.google.dev/gemini-api/terms — Accessed 2026-07-19 — rows 15,16,19.
- G7. Context caching (Interactions) — https://ai.google.dev/gemini-api/docs/caching — Accessed 2026-07-19 — row 9.
- G8. Context caching (legacy generateContent) — https://ai.google.dev/gemini-api/docs/generate-content/caching — Accessed 2026-07-19 — row 9.
- G9. Structured outputs — https://ai.google.dev/gemini-api/docs/structured-output — Accessed 2026-07-19 — row 4.
- G10. Function calling — https://ai.google.dev/gemini-api/docs/function-calling — Accessed 2026-07-19 — row 5.
- G11. Rate limits — https://ai.google.dev/gemini-api/docs/rate-limits — Accessed 2026-07-19 — rows 13,25.
- G12. Billing — https://ai.google.dev/gemini-api/docs/billing — Accessed 2026-07-19 — row 25 (hard tier caps).
- G13. Data logging and sharing — https://ai.google.dev/gemini-api/docs/logs-policy — Accessed 2026-07-19 — rows 17,18.
- G14. Interactions API overview — https://ai.google.dev/gemini-api/docs/interactions-overview — Accessed 2026-07-19 — rows 1,17,24.
- G15. Available regions — https://ai.google.dev/gemini-api/docs/available-regions — Accessed 2026-07-19 — row 19.
- G16. Deprecations — https://ai.google.dev/gemini-api/docs/deprecations — Accessed 2026-07-19 — rows 3,26.
- G17. API versions — https://ai.google.dev/gemini-api/docs/api-versions — Accessed 2026-07-19 — row 3.
- G18. Libraries — https://ai.google.dev/gemini-api/docs/libraries — Accessed 2026-07-19 — rows 14,23.
- G19. Files API — https://ai.google.dev/gemini-api/docs/files — Accessed 2026-07-19 — row 24.
- G20. API keys — https://ai.google.dev/gemini-api/docs/api-key — Accessed 2026-07-19 — row 22; §8.
- G21. GenerateContent API reference — https://ai.google.dev/api/generate-content — Accessed 2026-07-19 — rows 11,12.
- G22. GEAP zero data retention — https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention — Accessed 2026-07-19 — rows 15,18.
- G23. GEAP data residency — https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency — Accessed 2026-07-19 — row 19.
- G24. GEAP ML locations — https://docs.cloud.google.com/gemini-enterprise-agent-platform/machine-learning/general/locations — Accessed 2026-07-19 — row 19.
- G25. Google Cloud SOC 2 / ISO 27001 — https://cloud.google.com/security/compliance/soc-2 and /iso-27001 — Accessed 2026-07-19 — rows 20,21.
- G26. Zero data retention in the Gemini Developer API — https://ai.google.dev/gemini-api/docs/zdr — Accessed 2026-07-19 — last updated 2026-05-28 UTC — rows 16,17,18,24; the Phase 1C.0.1 correction's primary evidence (ledger C1-C3).
- G27. Interactions API — https://ai.google.dev/gemini-api/docs/interactions — Accessed 2026-07-19 — last updated 2026-07-16 UTC — rows 17,24; store=true default and 55-day paid retention re-verified.

**Repository sources:** brain/experiments/EXP-0001-prompt-to-brand-context.md (workload); docs/MODEL_AND_TOKEN_STRATEGY.md (tiers, budgets, API-billed preference); contracts/token-budget.schema.json (budget fields); brain/decisions/DEC-0009 (requirements this packet satisfies).
