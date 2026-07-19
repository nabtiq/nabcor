// Live-call authorization boundary (DEC-0019; DEC-0014 mechanics).
//
// A live provider call requires a separately authenticated, unconsumed
// Product Owner approval at the live-provider-call-approval gate, whose
// signed target is the exact provider-policy candidate the call runs under.
// The check/consume split keeps ordering safe: presence and validity are
// checked BEFORE budget reservation and credential resolution (an invalid or
// missing authorization fails first and consumes nothing), and the atomic
// single-use consumption (DEC-0014 receipt semantics) happens only after the
// budget reservation succeeds and immediately before credential resolution —
// so a budget refusal never burns an approval, and a consumed approval can
// never authorize a second call.
//
// In this phase NO live authorization exists: the production wiring is
// noLiveCallAuthorization, whose check always fails closed. The
// verifier-backed implementation exists so the gate is machine-enforceable
// and testable with ephemeral keys — not because any live call is possible.
import {
  type HumanGateVerifierDeps,
  verifyAndConsumeApproval,
} from "../../authority/verify-approval.js";
import { type Result, err, ok } from "../../kernel/result.js";

export const LIVE_CALL_GATE = "live-provider-call-approval";

export interface LiveCallAuthorization {
  /** Presence + validity; consumes nothing. */
  check(): Result<void>;
  /** Atomic single-use consumption; exactly one call can ever succeed. */
  consume(): Result<{ authorizationRef: string }>;
}

/** The production state of this phase: no live authorization exists. */
export const noLiveCallAuthorization: LiveCallAuthorization = {
  check: () =>
    err({
      kind: "live-call-authorization-missing",
      message:
        "no live-call authorization exists; live provider invocation requires a separately signed, unconsumed live-provider-call-approval (none is granted in Phase 1C.1)",
    }),
  consume: () =>
    err({
      kind: "live-call-authorization-missing",
      message: "no live-call authorization exists to consume",
    }),
};

/**
 * Verifier-backed authorization over signed approval evidence. check()
 * validates shape, gate, expiry, and target digest without consuming;
 * consume() runs the full DEC-0014 verification with atomic nonce
 * consumption against the trusted policy/registry/store boundary.
 */
export class ApprovalLiveCallAuthorization implements LiveCallAuthorization {
  readonly #evidence: unknown;
  readonly #deps: HumanGateVerifierDeps;
  readonly #expectedTargetDigest: string;

  constructor(evidence: unknown, deps: HumanGateVerifierDeps, expectedTargetDigest: string) {
    this.#evidence = evidence;
    this.#deps = deps;
    this.#expectedTargetDigest = expectedTargetDigest;
  }

  check(): Result<void> {
    const validated = this.#deps.contracts.validate("approval-evidence", this.#evidence);
    if (!validated.ok) {
      return err({
        kind: "live-call-authorization-invalid",
        message: "presented live-call evidence failed approval-evidence contract validation",
      });
    }
    const payload = validated.value["payload"] as Record<string, unknown>;
    if (payload["gate"] !== LIVE_CALL_GATE) {
      return err({
        kind: "live-call-authorization-invalid",
        message: `presented evidence is for gate '${String(payload["gate"])}', not '${LIVE_CALL_GATE}'`,
      });
    }
    if (payload["verdict"] !== "approved") {
      return err({
        kind: "live-call-authorization-invalid",
        message: "presented live-call evidence carries a rejected verdict",
      });
    }
    if (payload["target_artifact_digest"] !== this.#expectedTargetDigest) {
      return err({
        kind: "live-call-authorization-invalid",
        message: "presented live-call evidence does not bind the active signed provider-policy candidate",
      });
    }
    const nowMs = Date.parse(this.#deps.clock());
    if (Date.parse(String(payload["expires_at"])) <= nowMs) {
      return err({
        kind: "live-call-authorization-invalid",
        message: "presented live-call evidence is expired",
      });
    }
    return ok(undefined);
  }

  consume(): Result<{ authorizationRef: string }> {
    const authorized = verifyAndConsumeApproval(this.#evidence, this.#deps);
    if (!authorized.ok) {
      // Replay, signature, policy, and lifecycle denials all land here typed.
      return authorized.error.kind === "approval-replay" || authorized.error.kind === "approval-unauthorized"
        ? err({
            kind: "live-call-authorization-invalid",
            message: `live-call authorization failed verification/consumption (${authorized.error.kind})`,
          })
        : err(authorized.error);
    }
    if (authorized.value.verdict !== "approved") {
      return err({
        kind: "live-call-authorization-invalid",
        message: "live-call authorization verdict is a rejection; nothing is authorized",
      });
    }
    return ok({ authorizationRef: authorized.value.receiptId });
  }
}
