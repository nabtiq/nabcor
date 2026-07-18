// Offline provider-neutral gateway kernel (DEC-0009, DEC-0010; INV-PROV-001,
// INV-TOK-001/002, INV-OBS-001, INV-DET-001). Every capability invocation
// crosses this boundary: the request is contract-validated, the ratified
// gateway policy is enforced fail-closed before any adapter runs, the token
// budget is checked before invocation, a context manifest is persisted before
// the adapter call, adapter output is returned only after it validates against
// the requested contract, and a truthful model-run record is written for every
// outcome that passes request validation.
//
// Record-creation boundary (documented precisely, per DEC-0010): a request that
// fails gateway-request schema validation has no trustworthy identity, so it
// fails BEFORE any record exists. Every later rejection — policy, budget,
// context, scenario, adapter, output validation — writes a model-run failure
// record using the request's validated identity, with `failure_type` mapping:
// policy rejections → "refusal" · budget breaches → "loop_budget" · missing
// context and output-validation failures → "validation_failure" · unknown
// scenario and adapter errors → "tool_error". Zero tokens and
// {mode: "free-tier", usd: 0, allocation: "none"} are the truthful accounting
// for an adapter that invokes no model and can spend nothing (DEC-0009);
// `latency_ms` is null — never estimated. Deterministic validation failures
// are never retried (`retry_count: 0`, single bounded invocation).
import { readFileSync } from "node:fs";
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type KernelFailure, type Result, describeFailure, err, ok } from "../kernel/result.js";
import type { AdapterInvocation, GatewayAdapter } from "./adapter.js";
import type { RunRecordStore } from "./record-store.js";

// Version label recorded in every context manifest (contract field
// `context_selector_version`): the gateway's deterministic pass-through
// selector — it loads exactly the request's declared context items.
const CONTEXT_SELECTOR_VERSION = "gateway-offline-kernel-0.1.0";

export interface GatewayDependencies {
  registry: ContractRegistry;
  recordStore: RunRecordStore;
  /** Registered adapters; construction fails closed on any adapter the policy does not allow. */
  adapters: readonly GatewayAdapter[];
  /** Path to the committed active gateway policy document. */
  policyPath: string;
  /** Injected ISO 8601 clock so runs are deterministic under test. */
  clock: () => string;
  /**
   * Resolves whether a declared context item exists in the caller's namespace.
   * Injected so the gateway stays storage-agnostic and deterministic under test.
   */
  contextResolver: (workspace: string, brand: string, artifactId: string) => boolean;
}

export interface GatewayInvocationSuccess {
  /** The adapter output, returned only after it validated against the requested contract. */
  artifact: Record<string, unknown>;
  runId: string;
  manifestId: string;
}

export interface ModelGateway {
  invoke(request: unknown): Result<GatewayInvocationSuccess>;
}

type FailureType = "refusal" | "loop_budget" | "validation_failure" | "tool_error";

interface RequestIdentity {
  requestId: string;
  runId: string;
  sessionId: string;
  projectId: string;
  workspaceId: string;
  brandId: string;
  workflowId: string;
  skillId: string;
  adapterId: string;
  requestedTier: number;
  dataClassification: string;
  outputContract: string;
  scenarioId: string;
  maxOutputTokens: number;
}

const asString = (v: unknown): string => (typeof v === "string" ? v : String(v));

export class OfflineGateway implements ModelGateway {
  readonly #registry: ContractRegistry;
  readonly #recordStore: RunRecordStore;
  readonly #adapters: Map<string, GatewayAdapter>;
  readonly #clock: () => string;
  readonly #contextResolver: GatewayDependencies["contextResolver"];
  readonly #allowedAdapters: ReadonlySet<string>;
  readonly #allowedDataClasses: ReadonlySet<string>;
  readonly #requiredTier: number;

  private constructor(
    deps: GatewayDependencies,
    allowedAdapters: ReadonlySet<string>,
    allowedDataClasses: ReadonlySet<string>,
    requiredTier: number
  ) {
    this.#registry = deps.registry;
    this.#recordStore = deps.recordStore;
    this.#adapters = new Map(deps.adapters.map((a) => [a.adapterId, a]));
    this.#clock = deps.clock;
    this.#contextResolver = deps.contextResolver;
    this.#allowedAdapters = allowedAdapters;
    this.#allowedDataClasses = allowedDataClasses;
    this.#requiredTier = requiredTier;
  }

  /**
   * Fail-closed construction: a missing, unreadable, unparseable, or
   * contract-invalid active policy means no gateway exists. Registering an
   * adapter the policy does not allow, or whose tier the policy does not
   * require, is refused here — before any request can be made.
   */
  static create(deps: GatewayDependencies): Result<OfflineGateway> {
    let raw: string;
    try {
      raw = readFileSync(deps.policyPath, "utf8");
    } catch (e) {
      return err({
        kind: "invalid-policy",
        message: `active gateway policy unreadable at '${deps.policyPath}': ${String(e)} — the gateway fails closed without a valid policy`,
      });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return err({
        kind: "invalid-policy",
        message: `active gateway policy is not valid JSON: ${String(e)}`,
      });
    }
    const validated = deps.registry.validate("gateway-policy", parsed);
    if (!validated.ok) {
      return err({
        kind: "invalid-policy",
        message: `active gateway policy failed contract validation: ${describeFailure(validated.error)}`,
      });
    }
    const policy = validated.value;
    const allowedAdapters = new Set((policy["allowed_adapters"] as string[]).map(asString));
    const allowedDataClasses = new Set((policy["allowed_data_classes"] as string[]).map(asString));
    const requiredTier = policy["required_execution_tier"] as number;
    for (const adapter of deps.adapters) {
      if (!allowedAdapters.has(adapter.adapterId)) {
        return err({
          kind: "adapter-not-approved",
          adapterId: adapter.adapterId,
          message: `adapter '${adapter.adapterId}' is registered but not in the policy allowlist [${[...allowedAdapters].join(", ")}]; construction fails closed`,
        });
      }
      if (adapter.executionTier !== requiredTier) {
        return err({
          kind: "tier-not-permitted",
          requestedTier: adapter.executionTier,
          message: `adapter '${adapter.adapterId}' declares tier ${adapter.executionTier} but the policy requires tier ${requiredTier}`,
        });
      }
    }
    return ok(new OfflineGateway(deps, allowedAdapters, allowedDataClasses, requiredTier));
  }

  invoke(request: unknown): Result<GatewayInvocationSuccess> {
    // 1. Boundary validation: the request stays `unknown` until the contract
    //    accepts it. Failure here precedes all records (no trusted identity).
    const validated = this.#registry.validate("gateway-request", request);
    if (!validated.ok) {
      const issues = validated.error.kind === "validation-failed" ? validated.error.issues : [];
      return err({
        kind: "invalid-request",
        issues,
        message: "request failed gateway-request contract validation",
      });
    }
    const data = validated.value;
    const id: RequestIdentity = {
      requestId: asString(data["request_id"]),
      runId: asString(data["run_id"]),
      sessionId: asString(data["session_id"]),
      projectId: asString(data["project_id"]),
      workspaceId: asString(data["workspace_id"]),
      brandId: asString(data["brand_id"]),
      workflowId: asString(data["workflow_id"]),
      skillId: asString(data["skill_id"]),
      adapterId: asString(data["adapter_id"]),
      requestedTier: data["requested_tier"] as number,
      dataClassification: asString(data["data_classification"]),
      outputContract: asString(data["output_contract"]),
      scenarioId: asString(data["scenario_id"]),
      maxOutputTokens: data["max_output_tokens"] as number,
    };
    const startedAt = this.#clock();
    const contextItems = data["context_items"] as {
      artifact_id: string;
      reason: string;
      required: boolean;
    }[];
    const budget = data["token_budget"] as Record<string, unknown>;

    // 2. Policy enforcement, fail-closed, before any adapter work. The strict
    //    request contract already rejects credential-bearing fields; these
    //    checks reject real-provider adapters, disallowed data classes, and
    //    non-permitted tiers.
    if (!this.#allowedAdapters.has(id.adapterId)) {
      return this.#reject(id, startedAt, null, 0, "refusal", {
        kind: "adapter-not-approved",
        adapterId: id.adapterId,
        message: `adapter '${id.adapterId}' is not in the policy allowlist [${[...this.#allowedAdapters].join(", ")}] (DEC-0009: no external provider is approved)`,
      });
    }
    const adapter = this.#adapters.get(id.adapterId);
    if (!adapter) {
      return this.#reject(id, startedAt, null, 0, "refusal", {
        kind: "adapter-not-approved",
        adapterId: id.adapterId,
        message: `adapter '${id.adapterId}' is allowed by policy but not registered; the gateway fails closed rather than improvising`,
      });
    }
    if (!this.#allowedDataClasses.has(id.dataClassification)) {
      return this.#reject(id, startedAt, null, 0, "refusal", {
        kind: "data-class-not-permitted",
        dataClass: id.dataClassification,
        message: `data classification '${id.dataClassification}' is not permitted [allowed: ${[...this.#allowedDataClasses].join(", ")}]; real client data is prohibited from every model path (DEC-0009)`,
      });
    }
    if (id.requestedTier !== this.#requiredTier) {
      return this.#reject(id, startedAt, null, 0, "refusal", {
        kind: "tier-not-permitted",
        requestedTier: id.requestedTier,
        message: `requested tier ${id.requestedTier} is not permitted; the active policy requires tier ${this.#requiredTier} (no model exists behind this gateway)`,
      });
    }
    if (this.#registry.schemaIdFor(id.outputContract) === undefined) {
      return this.#reject(id, startedAt, null, 0, "validation_failure", {
        kind: "output-validation-failed",
        artifactType: id.outputContract,
        issues: [],
        message: `requested output contract '${id.outputContract}' is not a registered contract; output could never be validated, so the request is rejected before invocation`,
      });
    }

    // 3. Budget preflight — before the manifest and before the adapter
    //    (INV-TOK-001). The applicable hard stop is hard_stop_output when
    //    declared, otherwise output_budget.
    const outputBudget = budget["output_budget"] as number;
    const hardStopRaw = budget["hard_stop_output"];
    const hardStop = typeof hardStopRaw === "number" ? hardStopRaw : outputBudget;
    if (id.maxOutputTokens > hardStop) {
      return this.#reject(id, startedAt, null, 0, "loop_budget", {
        kind: "budget-exceeded",
        message: `declared max_output_tokens ${id.maxOutputTokens} exceeds the applicable hard stop ${hardStop} (budget '${asString(budget["budget_id"])}'); breach occurs before invocation`,
      });
    }
    const maxToolCalls = budget["max_tool_calls"] as number;
    if (maxToolCalls < 1) {
      return this.#reject(id, startedAt, null, 0, "loop_budget", {
        kind: "budget-exceeded",
        message: `budget '${asString(budget["budget_id"])}' allows ${maxToolCalls} tool calls; one adapter invocation would exceed it, so the request is rejected before invocation`,
      });
    }

    // 4. Context manifest — built and persisted BEFORE the adapter call
    //    (INV-TOK-002). Unresolvable items are recorded as retrieval failures;
    //    an unresolvable REQUIRED item is a typed failure and the adapter is
    //    never invoked.
    const loaded: { artifact_id: string; reason: string; tokens_estimate: null }[] = [];
    const missing: { wanted: string; why_missing: string }[] = [];
    let requiredMissing: string | null = null;
    for (const item of contextItems) {
      if (this.#contextResolver(id.workspaceId, id.brandId, item.artifact_id)) {
        loaded.push({ artifact_id: item.artifact_id, reason: item.reason, tokens_estimate: null });
      } else {
        missing.push({
          wanted: item.artifact_id,
          why_missing: `context item not resolvable in ${id.workspaceId}/${id.brandId}`,
        });
        if (item.required && requiredMissing === null) requiredMissing = item.artifact_id;
      }
    }
    const manifestId = `cm_${id.runId}`;
    const manifest = {
      schema_version: "1.7.0",
      manifest_id: manifestId,
      run_ref: id.runId,
      skill_id: id.skillId,
      artifacts_loaded: loaded,
      learnings_classes_consulted: [],
      decisions_consulted: [],
      fresh_context_size: null,
      cached_context_size: null,
      context_selector_version: CONTEXT_SELECTOR_VERSION,
      retrieval_failures: missing,
    };
    const manifestPut = this.#recordStore.put(id.workspaceId, id.brandId, "context-manifest", manifest);
    if (!manifestPut.ok) {
      return err({
        kind: "record-persistence-failure",
        message: `context manifest '${manifestId}' could not be persisted (${describeFailure(manifestPut.error)}); the adapter was not invoked`,
      });
    }
    if (requiredMissing !== null) {
      return this.#reject(id, startedAt, manifestId, 0, "validation_failure", {
        kind: "missing-context",
        message: `required context item '${requiredMissing}' is not resolvable in ${id.workspaceId}/${id.brandId}; the adapter was not invoked (manifest '${manifestId}' records the retrieval failure)`,
      });
    }

    // 5. Single bounded adapter invocation. Adapter exceptions never cross the
    //    gateway boundary raw.
    let outcome: Result<unknown>;
    try {
      const invocation: AdapterInvocation = {
        scenarioId: id.scenarioId,
        outputContract: id.outputContract,
      };
      outcome = adapter.invoke(invocation);
    } catch (e) {
      return this.#reject(id, startedAt, manifestId, 1, "tool_error", {
        kind: "adapter-failure",
        message: `adapter '${id.adapterId}' threw instead of returning a typed result: ${String(e)}`,
      });
    }
    if (!outcome.ok) {
      const failure =
        outcome.error.kind === "scenario-not-found"
          ? outcome.error
          : {
              kind: "adapter-failure" as const,
              message: `adapter '${id.adapterId}' failed: ${describeFailure(outcome.error)}`,
            };
      return this.#reject(id, startedAt, manifestId, 1, "tool_error", failure);
    }

    // 6. Structured-output validation: the artifact is returned only after the
    //    requested contract accepts it. Deterministic validation failures are
    //    not retried.
    const artifact = this.#registry.validate(id.outputContract, outcome.value);
    if (!artifact.ok) {
      const issues = artifact.error.kind === "validation-failed" ? artifact.error.issues : [];
      return this.#reject(id, startedAt, manifestId, 1, "validation_failure", {
        kind: "output-validation-failed",
        artifactType: id.outputContract,
        issues,
        message: `adapter output failed '${id.outputContract}' contract validation and is not returned`,
      });
    }

    // 7. Truthful success record; the invocation only succeeds if the record
    //    persists (INV-OBS-001: every gateway call writes a model-run record).
    const outId = artifact.value["artifact_id"];
    const runRecord = this.#buildRunRecord(id, startedAt, manifestId, 1, null, adapter, {
      artifactIdsOut: typeof outId === "string" ? [outId] : [],
      artifactIdsIn: loaded.map((l) => l.artifact_id),
    });
    const recordPut = this.#recordStore.put(id.workspaceId, id.brandId, "model-run", runRecord);
    if (!recordPut.ok) {
      return err({
        kind: "record-persistence-failure",
        message: `run record '${id.runId}' could not be persisted (${describeFailure(recordPut.error)}); the artifact is withheld because an unrecorded run would violate INV-OBS-001`,
      });
    }
    return ok({ artifact: artifact.value, runId: id.runId, manifestId });
  }

  /**
   * Persist a truthful failure record, then return the typed failure. If even
   * the failure record cannot persist, the persistence failure (naming the
   * original failure) is returned instead — observability loss is never silent.
   */
  #reject(
    id: RequestIdentity,
    startedAt: string,
    manifestId: string | null,
    toolCalls: number,
    failureType: FailureType,
    failure: KernelFailure
  ): Result<GatewayInvocationSuccess> {
    const adapter = this.#adapters.get(id.adapterId);
    const record = this.#buildRunRecord(id, startedAt, manifestId, toolCalls, failureType, adapter, {
      artifactIdsOut: [],
      artifactIdsIn: [],
    });
    const put = this.#recordStore.put(id.workspaceId, id.brandId, "model-run", record);
    if (!put.ok) {
      return err({
        kind: "record-persistence-failure",
        message: `failure record for run '${id.runId}' (${failure.kind}) could not be persisted: ${describeFailure(put.error)}`,
      });
    }
    return err(failure);
  }

  #buildRunRecord(
    id: RequestIdentity,
    startedAt: string,
    manifestId: string | null,
    toolCalls: number,
    failureType: FailureType | null,
    adapter: GatewayAdapter | undefined,
    io: { artifactIdsIn: string[]; artifactIdsOut: string[] }
  ): Record<string, unknown> {
    return {
      schema_version: "1.7.0",
      run_id: id.runId,
      session_id: id.sessionId,
      project_id: id.projectId,
      workspace_id: id.workspaceId,
      brand_id: id.brandId,
      workflow_id: id.workflowId,
      skill_id: id.skillId,
      attribution_confidence: "confirmed",
      artifact_ids_in: io.artifactIdsIn,
      artifact_ids_out: io.artifactIdsOut,
      context_manifest_ref: manifestId,
      // Rejected requests may name an unregistered adapter; the record still
      // states truthfully which gateway path ran (offline, no model).
      provider: adapter?.provider ?? "offline",
      model: adapter?.modelLabel ?? `unregistered:${id.adapterId}`,
      model_tier: 0,
      prompt_version: null,
      started_at: startedAt,
      latency_ms: null,
      input_tokens: 0,
      output_tokens: 0,
      cached_tokens: 0,
      cache_creation_tokens: 0,
      reasoning_tokens: null,
      cost: { mode: "free-tier", usd: 0, allocation: "none" },
      tool_calls: toolCalls,
      retry_count: 0,
      failure_type: failureType,
      media: null,
      human_review: "none",
      accepted: null,
      rejected_reason: null,
      superseded_by: null,
    };
  }
}
