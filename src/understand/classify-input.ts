// Tier-0 classify-input: deterministic classification of structured input
// descriptors into schema-valid `source` artifacts (skills/classify-input.skill.yaml).
//
// Boundaries in this phase: no OCR, no PDF/DOCX extraction, no URL fetching, no
// network access, no model calls. PDF/DOCX/image/logo inputs are descriptors only
// and are honestly recorded as capture.status="descriptor-only"; URLs are locators
// only ("external-unfetched"). Inline prompt/text/markdown content is persisted to
// the immutable content-addressed store BEFORE the source artifact is returned, so
// every fragment-cited character of it stays auditable (DEC-0006). Embedded text is
// data — it is scanned for obvious injection patterns; flagged inline content is
// captured only into the quarantine namespace, never the clear one (INV-SEC-002).
import type { ContractRegistry } from "../kernel/contract-registry.js";
import type { FileContentStore } from "../kernel/content-store.js";
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
  /** Inline text; accepted only for prompt/text/markdown descriptors. */
  content?: string;
  origin?: "client" | "operator" | "generated" | "licensed" | "public_web";
  /** When omitted, rights default conservatively (INV-DATA-002 default-deny). */
  rights?: Rights;
  visual_classification?: "documentary" | "illustrative" | "generated" | "conceptual";
}

export interface ClassifyOptions {
  workspace: string;
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

// Kinds whose inline text the kernel captures byte-exactly. Everything else is a
// descriptor without bytes and must not pretend to be captured.
const INLINE_KINDS = new Set<DescriptorKind>(["prompt", "text", "markdown"]);
const MEDIA_TYPES: Partial<Record<DescriptorKind, string>> = {
  prompt: "text/plain",
  text: "text/plain",
  markdown: "text/markdown",
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
  registry: ContractRegistry,
  contentStore: FileContentStore
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
    if (d.content !== undefined && !INLINE_KINDS.has(d.kind)) {
      return err({
        kind: "invalid-input",
        message: `descriptor ${i}: inline content is only accepted for prompt/text/markdown kinds, not '${d.kind}' (no bytes are read in this phase)`,
      });
    }
    // Scan both the inline content and the locator itself; a filename can carry
    // seeded instructions just as document text can.
    const scan = scanForInjection(`${d.name}\n${d.content ?? ""}`);

    // Capture honesty (DEC-0006): inline text is persisted before the artifact
    // exists; descriptors without bytes say so; URLs stay unfetched.
    let capture: Record<string, unknown>;
    if (INLINE_KINDS.has(d.kind) && typeof d.content === "string") {
      const stored = contentStore.put(
        options.workspace,
        options.brandRef,
        scan.flagged ? "quarantine" : "clear",
        d.content
      );
      if (!stored.ok) return stored;
      capture = {
        status: "captured",
        content_ref: stored.value.contentRef,
        sha256: stored.value.sha256,
        bytes: stored.value.bytes,
        media_type: MEDIA_TYPES[d.kind] ?? null,
        safety: scan.flagged ? "quarantined" : "clear",
      };
    } else if (d.kind === "url") {
      capture = { status: "external-unfetched" };
    } else {
      capture = { status: "descriptor-only" };
    }

    const artifact: Record<string, unknown> = {
      schema_version: "1.7.0",
      artifact_id: `${prefix}_${String(i + 1).padStart(4, "0")}`,
      brand_ref: options.brandRef,
      created_at: options.createdAt,
      creator_type: "deterministic",
      lifecycle_status: "generated",
      kind: KIND_MAP[d.kind],
      origin: d.origin ?? "client",
      filename_or_locator: d.name,
      rights: d.rights ?? { ...CONSERVATIVE_RIGHTS },
      capture,
      injection_flag: scan.flagged,
    };
    if (scan.note) artifact["injection_note"] = scan.note;
    if (d.kind === "image" || d.kind === "logo") {
      // Documentary status is never inferred from absence (INV-FACT-003):
      // an unclassified visual stays explicitly unresolved (null).
      artifact["visual_classification"] = d.visual_classification ?? null;
    }
    const validated = registry.validate("source", artifact);
    if (!validated.ok) return validated;
    artifacts.push(validated.value);
  }
  return ok(artifacts);
}
