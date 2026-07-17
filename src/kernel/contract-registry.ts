// Contract registry: the existing JSON Schemas in contracts/ are the canonical
// runtime authority (INV-DET-001). This module compiles them once, maps artifact
// types to schema IDs, and validates artifacts before they cross a runtime
// boundary. It deliberately does NOT re-declare the schemas as TypeScript
// interfaces — artifacts stay `unknown` until validated, so there is one source
// of truth.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import AjvModule from "ajv";
import type { ValidateFunction } from "ajv";
import addFormatsModule from "ajv-formats";

// ajv/ajv-formats ship CJS whose module.exports also carries `.default`; under
// NodeNext the `.default` property is the correctly typed constructor/plugin at
// both compile time and runtime.
const Ajv = AjvModule.default;
const addFormats = addFormatsModule.default;
import { type Result, type ValidationIssue, err, ok } from "./result.js";
import { parseSourceRef } from "./source-ref.js";

// Artifact types the Phase 1A kernel stores and exchanges. Other contracts
// (decision, evaluation-report, ...) compile too, but only these cross the
// kernel's runtime boundaries in this phase.
export const SUPPORTED_ARTIFACT_TYPES = [
  "source",
  "claim",
  "assumption",
  "brand-context",
] as const;
export type SupportedArtifactType = (typeof SUPPORTED_ARTIFACT_TYPES)[number];

interface SemanticCheck {
  invariant: string;
  check: (data: Record<string, unknown>) => string[];
}

// Deterministic cross-field checks the schemas cannot express, mirrored from
// contracts/validate.mjs for the types this kernel exchanges at runtime.
const SEMANTIC_CHECKS: Record<string, SemanticCheck[]> = {
  claim: [
    {
      invariant: "INV-FACT-002 inference-verification-needs-human",
      check: (d) =>
        d["classification"] === "inference" &&
        d["verification_status"] === "verified" &&
        !d["verified_by"]
          ? ["inference claim marked verified without verified_by (human confirmation)"]
          : [],
    },
    {
      invariant: "INV-FACT-001 chars-fragment-ordered",
      check: (d) => {
        const ref = d["source_ref"];
        if (typeof ref !== "string") return [];
        const parsed = parseSourceRef(ref);
        if (parsed?.fragment?.kind === "chars" && parsed.fragment.start >= parsed.fragment.end) {
          return [
            `source_ref character fragment ${parsed.fragment.start}-${parsed.fragment.end} is invalid: start must be less than end`,
          ];
        }
        return [];
      },
    },
  ],
  source: [
    {
      invariant: "INV-SEC-002 flagged-captured-content-must-be-quarantined",
      check: (d) => {
        const capture = d["capture"] as Record<string, unknown> | undefined;
        if (
          d["injection_flag"] === true &&
          capture?.["status"] === "captured" &&
          capture["safety"] !== "quarantined"
        ) {
          return [
            "captured content is injection-flagged but not in the quarantine namespace (a flag is not a quarantine)",
          ];
        }
        return [];
      },
    },
  ],
};

export class ContractRegistry {
  private constructor(
    private readonly validators: Map<string, ValidateFunction>,
    private readonly schemaIds: Map<string, string>
  ) {}

  static load(contractsDir: string): ContractRegistry {
    const files = readdirSync(contractsDir)
      .filter((f) => f.endsWith(".schema.json"))
      .sort();
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const parsed: { type: string; schema: { $id?: string } }[] = [];
    for (const file of files) {
      const schema = JSON.parse(readFileSync(join(contractsDir, file), "utf8")) as {
        $id?: string;
      };
      if (!schema.$id) throw new Error(`${file}: missing $id`);
      ajv.addSchema(schema);
      parsed.push({ type: file.replace(/\.schema\.json$/, ""), schema });
    }
    const validators = new Map<string, ValidateFunction>();
    const schemaIds = new Map<string, string>();
    for (const { type, schema } of parsed) {
      const validate = ajv.getSchema(schema.$id as string);
      if (!validate) throw new Error(`${type}: schema failed to compile`);
      validators.set(type, validate);
      schemaIds.set(type, schema.$id as string);
    }
    return new ContractRegistry(validators, schemaIds);
  }

  get knownTypes(): string[] {
    return [...this.validators.keys()];
  }

  schemaIdFor(artifactType: string): string | undefined {
    return this.schemaIds.get(artifactType);
  }

  isSupported(artifactType: string): artifactType is SupportedArtifactType {
    return (SUPPORTED_ARTIFACT_TYPES as readonly string[]).includes(artifactType);
  }

  /** Validate an artifact against its contract: schema layer + deterministic semantic layer. */
  validate(artifactType: string, artifact: unknown): Result<Record<string, unknown>> {
    const validator = this.validators.get(artifactType);
    if (!validator) {
      return err({
        kind: "unknown-artifact-type",
        artifactType,
        message: `no contract registered for artifact type '${artifactType}'`,
      });
    }
    if (!validator(artifact)) {
      const issues: ValidationIssue[] = (validator.errors ?? []).map((e) => ({
        artifactType,
        instancePath: e.instancePath || "/",
        keyword: e.keyword,
        message: e.message ?? "invalid",
      }));
      return err({
        kind: "validation-failed",
        artifactType,
        issues,
        message: `artifact failed ${artifactType} schema validation`,
      });
    }
    const data = artifact as Record<string, unknown>;
    const semanticIssues: ValidationIssue[] = [];
    for (const { invariant, check } of SEMANTIC_CHECKS[artifactType] ?? []) {
      for (const violation of check(data)) {
        semanticIssues.push({
          artifactType,
          instancePath: "/",
          keyword: invariant,
          message: violation,
        });
      }
    }
    if (semanticIssues.length > 0) {
      return err({
        kind: "validation-failed",
        artifactType,
        issues: semanticIssues,
        message: `artifact failed ${artifactType} semantic validation`,
      });
    }
    return ok(data);
  }
}
