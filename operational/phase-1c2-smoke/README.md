# Phase 1C.2 — Anthropic smoke-verification evidence

Public, sanitized evidence for the one authorized Anthropic connectivity smoke
call (DEC-0020). These three artifacts carry no credential, no prompt/response
body, no header, and no sensitive billing detail. Two artifacts stay **outside**
this repository by design and are referenced here by identifier and digest only:
the Product Owner's signed approval evidence and its consumption receipt (they
live in the operator's external operational store, mirroring the Phase 1C.1
signing evidence), and the macOS Keychain credential (never on disk in the clear,
never in Git).

## The evidence chain

1. `live-provider-call-request.json` — the immutable, one-shot authorization
   target. Its canonical content digest is
   `sha256:96dde7e1d342e99e58c12561ae4f2e873ad6cc717a2a87778b36f578f6e0bd01`.
   The Product Owner signed exactly this digest under the
   `live-provider-call-approval` gate. It binds the signed provider-policy
   candidate (`sha256:6df3adc9…f938be3`) and the active gateway policy, fixes
   the model (`claude-haiku-4-5-20251001`), the synthetic fixture, the USD 0.25
   ceremony ceiling, one attempt with retry and escalation disabled, and every
   optional provider surface disabled. `exp_0001_authorized` is `false`.

2. `provider-smoke-result.json` — the sanitized result of the single real
   request. `status: succeeded`, exactly one transport call, `returned_model`
   equal to `requested_model`, provider request id `req_011CdCMh56jCehQxJjzu9VJr`,
   240 input / 15 output tokens, `settled_usd` 0.01 (cent-granular ledger ceiling
   over the computed 0.000315), and the validated structured-output digest. It
   binds the request digest above and the single-use consumption receipt.

3. `provider-reconciliation-record.json` — the reconciliation of the local
   accounting against the Product Owner's personal Anthropic Console review:
   exactly one request visible, model Claude Haiku 4.5, monthly hard cap USD 60
   active, auto-reload disabled. The console did not surface per-request tokens,
   per-request cost, or the request id at this latency and granularity, so cost
   could not be compared to the cent; this is recorded as an explicit
   `precision_limitation` (`provider_usd: null`, `usd_within_tolerance` true only
   by that documented limitation) rather than a silent match. `reconciled: true`.

## Operational state

After reconciliation the committed operational state advanced
`CONFIGURED_BUT_LIVE_DISABLED → SMOKE_CALL_AUTHORIZED → SMOKE_VERIFIED_EXP_DISABLED`
(`contracts/provider-operational-state.active.json`). General
`live_invocation_enabled` stays `false` and `exp_0001_executed` stays `false` in
every state: the smoke call ran through a single consumed authorization, not a
standing flag, and EXP-0001 remains gated on its own separate future signed
approval. The authorization nonce is now consumed, so the request cannot be
replayed even by accident.
