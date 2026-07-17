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
  | { kind: "invalid-input"; message: string }
  | { kind: "io-error"; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: KernelFailure };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T = never>(error: KernelFailure): Result<T> => ({ ok: false, error });

export function describeFailure(error: KernelFailure): string {
  if (error.kind === "validation-failed") {
    const detail = error.issues
      .map((i) => `${i.artifactType}${i.instancePath || "/"} [${i.keyword}] ${i.message}`)
      .join("; ");
    return `${error.message}: ${detail}`;
  }
  return `${error.kind}: ${error.message}`;
}
