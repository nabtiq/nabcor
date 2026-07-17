// Tier-0 classify-input: deterministic classification of structured input
// descriptors into schema-valid `source` artifacts (skills/classify-input.skill.yaml).
//
// Boundaries in this phase: no OCR, no PDF/DOCX extraction, no URL fetching, no
// network access, no model calls. PDF/DOCX/image inputs are descriptors only;
// URLs are locators only. Embedded text is data — it is scanned for obvious
// injection patterns and flagged, never obeyed (INV-SEC-002).
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type Result, err, ok } from "../kernel/result.js";
import { scanForInjection } from "./injection-scan.js";

export type DescriptorKind =
  | "prompt"
  | "text"
  | "markdown"
  | "pdf"
  | "docx"
  | "image"
  | "logo"
  | "url";

export interface Rights {
  commercial_use: "allowed" | "forbidden" | "unknown";
  advertising_use: "allowed" | "forbidden" | "unknown";
  benchmark_use: "allowed" | "forbidden";
  training_use: "allowed" | "forbidden";
}

export interface InputDescriptor {
  kind: DescriptorKind;
  /** Filename or locator; preserved verbatim, never opened or fetched. */
  name: string;
  /** Inline text, only meaningful for prompt/text/markdown descriptors. */
  content?: string;
  origin?: "client" | "operator" | "generated" | "licensed" | "public_web";
  /** When omitted, rights default conservatively (INV-DATA-002 default-deny). */
  rights?: Rights;
  visual_classification?: "documentary" | "illustrative" | "generated" | "conceptual";
}

export interface ClassifyOptions {
  brandRef: string;
  createdAt: string;
  /** Prefix for generated artifact IDs; a sequence number is appended. */
  artifactIdPrefix?: string;
}

const KIND_MAP: Record<DescriptorKind, string> = {
  prompt: "prompt",
  text: "document",
  markdown: "document",
  pdf: "document",
  docx: "document",
  image: "image",
  logo: "logo",
  url: "url",
};

// Possession is not permission (INV-DATA-002): unsupplied rights are unknown for
// use and default-deny for benchmark/training.
const CONSERVATIVE_RIGHTS: Rights = {
  commercial_use: "unknown",
  advertising_use: "unknown",
  benchmark_use: "forbidden",
  training_use: "forbidden",
};

export function classifyInput(
  descriptors: InputDescriptor[],
  options: ClassifyOptions,
  registry: ContractRegistry
): Result<Record<string, unknown>[]> {
  if (descriptors.length === 0) {
    return err({ kind: "invalid-input", message: "no input descriptors supplied" });
  }
  const prefix = options.artifactIdPrefix ?? "src";
  const artifacts: Record<string, unknown>[] = [];
  for (let i = 0; i < descriptors.length; i++) {
    const d = descriptors[i]!;
    if (!KIND_MAP[d.kind]) {
      return err({ kind: "invalid-input", message: `descriptor ${i}: unsupported kind '${String(d.kind)}'` });
    }
    if (!d.name || typeof d.name !== "string") {
      return err({ kind: "invalid-input", message: `descriptor ${i}: missing filename_or_locator name` });
    }
    // Scan both the inline content and the locator itself; a filename can carry
    // seeded instructions just as document text can.
    const scan = scanForInjection(`${d.name}\n${d.content ?? ""}`);
    const artifact: Record<string, unknown> = {
      schema_version: "1.1.0",
      artifact_id: `${prefix}_${String(i + 1).padStart(4, "0")}`,
      brand_ref: options.brandRef,
      created_at: options.createdAt,
      creator_type: "deterministic",
      lifecycle_status: "generated",
      kind: KIND_MAP[d.kind],
      origin: d.origin ?? "client",
      filename_or_locator: d.name,
      rights: d.rights ?? { ...CONSERVATIVE_RIGHTS },
      injection_flag: scan.flagged,
    };
    if (scan.note) artifact["injection_note"] = scan.note;
    if (d.kind === "image" || d.kind === "logo") {
      artifact["visual_classification"] = d.visual_classification ?? "documentary";
    }
    const validated = registry.validate("source", artifact);
    if (!validated.ok) return validated;
    artifacts.push(validated.value);
  }
  return ok(artifacts);
}
