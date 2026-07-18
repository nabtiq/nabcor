// Typed results for every runtime boundary: operations return failures as data,
// never silently degraded artifacts (AGENTS.md rule; docs/AGENT_AND_SKILL_ARCHITECTURE.md §5).

export interface ValidationIssue {
  artifactType: string;
  instancePath: string;
  keyword: string;
  message: string;
}

export type KernelFailure =
  | { kind: "unknown-artifact-type"; artifactType: string; message: string }
  | { kind: "validation-failed"; artifactType: string; issues: ValidationIssue[]; message: string }
  | { kind: "unsafe-identifier"; field: string; value: string; message: string }
  | { kind: "namespace-violation"; message: string }
  | { kind: "artifact-exists"; artifactId: string; message: string }
  | { kind: "artifact-not-found"; artifactId: string; message: string }
  | { kind: "lineage-violation"; message: string }
  | { kind: "reference-violation"; message: string }
  | { kind: "quarantine-fail-closed"; sourceId: string; message: string }
  | { kind: "invalid-input"; message: string }
  | { kind: "io-error"; message: string }
  // Store-authoritative claim snapshots (DEC-0013): capture observed the
  // canonical claim namespace changing mid-capture, or a persisted
  // analysis/snapshot no longer matches the canonical store.
  | { kind: "snapshot-unstable"; message: string }
  | { kind: "stale-analysis"; message: string }
  // Gateway boundary failures (DEC-0009/DEC-0010). Every rejection crossing the
  // gateway is one of these typed values — raw exceptions never cross it.
  | { kind: "invalid-request"; issues: ValidationIssue[]; message: string }
  | { kind: "invalid-policy"; message: string }
  | { kind: "adapter-not-approved"; adapterId: string; message: string }
  | { kind: "data-class-not-permitted"; dataClass: string; message: string }
  | { kind: "tier-not-permitted"; requestedTier: number; message: string }
  | { kind: "budget-exceeded"; message: string }
  | { kind: "missing-context"; message: string }
  | { kind: "scenario-not-found"; scenarioId: string; message: string }
  | { kind: "adapter-failure"; message: string }
  | { kind: "output-validation-failed"; artifactType: string; issues: ValidationIssue[]; message: string }
  | { kind: "record-persistence-failure"; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: KernelFailure };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T = never>(error: KernelFailure): Result<T> => ({ ok: false, error });

export function describeFailure(error: KernelFailure): string {
  if (
    error.kind === "validation-failed" ||
    error.kind === "invalid-request" ||
    error.kind === "output-validation-failed"
  ) {
    const detail = error.issues
      .map((i) => `${i.artifactType}${i.instancePath || "/"} [${i.keyword}] ${i.message}`)
      .join("; ");
    return `${error.message}: ${detail}`;
  }
  return `${error.kind}: ${error.message}`;
}
