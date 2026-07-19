// Safe operator CLI tests (DEC-0017): the CLI is a thin orchestration
// boundary — read-only commands and dry runs mutate nothing, mutations
// require digest-bound confirmation, losers are never operator-supplied,
// no private key is ever read or accepted, and every failure is typed,
// stack-trace-free, and mapped to a stable exit code. All keys are
// ephemeral; nothing here touches the real Product Owner key.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  APPROVAL_DOMAIN,
  APPROVAL_PAYLOAD_TYPE,
  APPROVAL_PAYLOAD_VERSION,
  approvalPayloadDigest,
  signApprovalPayload,
} from "../src/authority/approval-payload.js";
import { verifyAndConsumeApproval } from "../src/authority/verify-approval.js";
import { loadTrustedAuthorityConfig } from "../src/authority/authority.js";
import { FileApprovalReceiptStore } from "../src/authority/receipt-store.js";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { contentDigest } from "../src/kernel/canonical-json.js";
import { BRAND, WS, registry, repoRoot, tempDir, validSlot, validTruthProfile } from "./helpers.js";
import { factClaim } from "./resolution-helpers.js";

const CLI = join(repoRoot, "dist", "src", "cli", "nabcor.js");
const KEYGEN = join(repoRoot, "dist", "src", "cli", "keygen.js");
const SIGN = join(repoRoot, "dist", "src", "cli", "sign-approval.js");
const SUBJECT = "ibrahim-mohamed";

interface CliRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(args: string[]): CliRun {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runJson(args: string[]): { status: number | null; body: Record<string, unknown> } {
  const result = run([...args, "--json"]);
  return { status: result.status, body: JSON.parse(result.stdout) as Record<string, unknown> };
}

/** Recursive file inventory of a directory tree (mutation detector). */
function inventory(root: string): string[] {
  const result = spawnSync("find", [root, "-type", "f"], { encoding: "utf8" });
  return result.stdout.trim().split("\n").filter(Boolean).sort();
}

interface CliScenario {
  storeRoot: string;
  receiptsRoot: string;
  store: FileArtifactStore;
  namespaceArgs: string[];
}

/** A seeded namespace with one open contradiction and a persisted profile. */
function cliScenario(claims?: Record<string, unknown>[]): CliScenario {
  const storeRoot = tempDir("nabcorcli-store");
  const store = new FileArtifactStore(storeRoot, registry());
  for (const c of claims ?? [factClaim("claim-keep", "Alpha Brand"), factClaim("claim-drop", "Beta Brand")]) {
    const put = store.put(WS, BRAND, "claim", c);
    if (!put.ok) throw new Error(`scenario claim put: ${JSON.stringify(put)}`);
  }
  const put = store.put(WS, BRAND, "truth-profile", validTruthProfile());
  if (!put.ok) throw new Error(`scenario profile put: ${JSON.stringify(put)}`);
  return {
    storeRoot,
    receiptsRoot: tempDir("nabcorcli-receipts"),
    store,
    namespaceArgs: ["--artifacts-root", storeRoot, "--workspace", WS, "--brand-ref", BRAND],
  };
}

/** Run snapshot dry-run to learn the current claim-set digest. */
function currentDigest(s: CliScenario): string {
  const { status, body } = runJson(["truth", "snapshot", ...s.namespaceArgs, "--dry-run"]);
  assert.equal(status, 0);
  return String(body["claim_set_digest"]);
}

/** Persist an analysis via the CLI; returns its refs and digests. */
function analyzed(s: CliScenario): { analysisDigest: string; fingerprint: string } {
  const digest = currentDigest(s);
  const { status, body } = runJson([
    "truth",
    "analyze",
    ...s.namespaceArgs,
    "--profile-ref",
    "tp_t_0001",
    "--snapshot-id",
    "snap-cli-1",
    "--analysis-id",
    "ta-cli-1",
    "--confirm-digest",
    digest,
  ]);
  assert.equal(status, 0, JSON.stringify(body));
  const contradictions = body["open_contradictions"] as { contradiction_fingerprint: string }[];
  return {
    analysisDigest: String(body["analysis_digest"]),
    fingerprint: contradictions[0] ? contradictions[0].contradiction_fingerprint : "",
  };
}

function prepared(s: CliScenario, analysisDigest: string, fingerprint: string): string {
  const { status, body } = runJson([
    "resolution",
    "prepare",
    ...s.namespaceArgs,
    "--analysis-ref",
    "ta-cli-1",
    "--fact-key",
    "identity.primary_name",
    "--contradiction-fingerprint",
    fingerprint,
    "--winner",
    "claim-keep",
    "--requester-id",
    SUBJECT,
    "--rationale",
    "synthetic CLI test resolution",
    "--decision-id",
    "frd-cli-1",
    "--confirm-digest",
    analysisDigest,
  ]);
  assert.equal(status, 0, JSON.stringify(body));
  return String(body["decision_digest"]);
}

interface SigningSetup {
  privateKeyPath: string;
  configDir: string;
  evidenceDir: string;
}

/** Ephemeral keypair enrolled in an isolated trusted-config directory. */
function signingSetup(): SigningSetup {
  const keyDir = tempDir("nabcorcli-keys");
  const privateKeyPath = join(keyDir, "private.pem");
  const candidatePath = join(keyDir, "candidate.json");
  const keygen = spawnSync(
    process.execPath,
    [
      KEYGEN,
      "--subject-id",
      SUBJECT,
      "--label",
      "Ephemeral nabcor-CLI test authority",
      "--roles",
      "product-owner",
      "--valid-from",
      "2020-01-01T00:00:00Z",
      "--private-key-out",
      privateKeyPath,
      "--public-candidate-out",
      candidatePath,
    ],
    { encoding: "utf8" }
  );
  assert.equal(keygen.status, 0, keygen.stderr);
  const candidate = JSON.parse(readFileSync(candidatePath, "utf8")) as Record<string, unknown>;
  const configDir = tempDir("nabcorcli-config");
  writeFileSync(
    join(configDir, "authority-registry.active.json"),
    JSON.stringify(
      {
        schema_version: "1.8.0",
        registry_id: "areg-nabcor",
        registry_version: 2,
        supersedes_registry_version: 1,
        created_at: "2026-07-19T00:08:51Z",
        decision_ref: "DEC-0015",
        authorities: [candidate],
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
  copyFileSync(
    join(repoRoot, "contracts", "human-gate-policy.active.json"),
    join(configDir, "human-gate-policy.active.json")
  );
  return { privateKeyPath, configDir, evidenceDir: tempDir("nabcorcli-evidence") };
}

function sign(
  s: CliScenario,
  setup: SigningSetup,
  targetRef: string,
  verdict: "approved" | "rejected",
  evidenceName: string
): string {
  const evidencePath = join(setup.evidenceDir, evidenceName);
  const result = spawnSync(
    process.execPath,
    [
      SIGN,
      "--private-key",
      setup.privateKeyPath,
      "--artifacts-root",
      s.storeRoot,
      "--workspace",
      WS,
      "--brand-ref",
      BRAND,
      "--target-type",
      "fact-resolution-decision",
      "--target-ref",
      targetRef,
      "--gate",
      "fact-resolution-approval",
      "--verdict",
      verdict,
      "--reason",
      "synthetic CLI test approval",
      "--requester-id",
      SUBJECT,
      "--evidence-out",
      evidencePath,
      "--trusted-config-dir",
      setup.configDir,
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  return evidencePath;
}

function applyArgs(s: CliScenario, evidencePath: string, confirmDigest: string, configDir: string): string[] {
  return [
    "resolution",
    "apply",
    ...s.namespaceArgs,
    "--receipts-root",
    s.receiptsRoot,
    "--evidence",
    evidencePath,
    "--confirm-digest",
    confirmDigest,
    "--trusted-config-dir",
    configDir,
  ];
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------
test("help is English-only, documents the exit codes and separation of stages; unknown commands and options exit 2", () => {
  const help = run(["help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /EXIT CODES/);
  assert.match(help.stdout, /personally|KEY OWNER/i);
  assert.match(help.stdout, /never reads a private key/);
  assert.ok(!/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(help.stdout), "help must be English-only");
  assert.ok(!/\[/.test(help.stdout), "no ANSI codes");

  assert.equal(run(["bogus"]).status, 2);
  assert.equal(run(["truth", "bogus"]).status, 2);
  assert.equal(run(["status", "--bogus-flag", "x"]).status, 2);
  assert.equal(run([]).status, 0, "no arguments prints help");
});

test("missing and duplicated required options exit 2 with a typed usage message and no stack trace", () => {
  const missing = run(["truth", "snapshot", "--workspace", WS]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /missing required option --artifacts-root|missing required option/);
  assert.ok(!missing.stderr.includes("    at "), "no stack traces for expected failures");

  const s = cliScenario();
  const duplicated = run(["truth", "snapshot", ...s.namespaceArgs, "--workspace", WS]);
  assert.equal(duplicated.status, 2);
  assert.match(duplicated.stderr, /given twice/);
});

test("--json emits exactly one parseable object for success and failure, with the documented exit code inside", () => {
  const ok = runJson(["status"]);
  assert.equal(ok.status, 0);
  assert.equal(ok.body["ok"], true);
  assert.equal(ok.body["command"], "status");

  const err = run(["truth", "snapshot", "--json"]);
  assert.equal(err.status, 2);
  const body = JSON.parse(err.stdout) as Record<string, unknown>;
  assert.equal(body["ok"], false);
  assert.equal(body["exit_code"], 2);
  assert.ok(!/\[/.test(err.stdout), "no ANSI codes in JSON mode");
});

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
test("status reports the zero-provider posture, public authority metadata, and frozen gates — without key bytes", () => {
  const human = run(["status"]);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /zero-provider policy \(DEC-0009\)/);
  assert.match(human.stdout, /adapters \["fake"\]/);
  assert.match(human.stdout, /data classes \["synthetic"\]/);
  assert.match(human.stdout, /frozen \(no independent reviewer/);
  assert.match(human.stdout, /k8cc9db703247760829dcb74819fbe07cd1dc24a2bf66ec7a02ed500391de8b1b/);

  // Public metadata only: the registry's SPKI base64 must NOT be echoed, and
  // nothing key-shaped may appear.
  const registryDoc = JSON.parse(
    readFileSync(join(repoRoot, "contracts", "authority-registry.active.json"), "utf8")
  ) as { authorities: { public_key_spki_b64: string }[] };
  for (const authority of registryDoc.authorities) {
    assert.ok(!human.stdout.includes(authority.public_key_spki_b64), "no raw public-key bytes in status");
  }
  assert.ok(!human.stdout.includes("PRIVATE"), "no private material in status");

  const json = runJson(["status"]);
  assert.equal(json.status, 0);
  const authorities = json.body["enrolled_authorities"] as Record<string, unknown>[];
  assert.ok(authorities.length >= 1);
  assert.ok(!("public_key_spki_b64" in authorities[0]!), "JSON carries no key bytes either");
  assert.match(String(json.body["current_phase"]), /Phase/);
});

// ---------------------------------------------------------------------------
// Snapshot / analyze
// ---------------------------------------------------------------------------
test("snapshot dry-run mutates nothing and prints the digest a real run requires; the real run persists exactly one artifact", () => {
  const s = cliScenario();
  const before = inventory(s.storeRoot);
  const dry = run(["truth", "snapshot", ...s.namespaceArgs, "--dry-run"]);
  assert.equal(dry.status, 0);
  assert.match(dry.stdout, /DRY RUN — nothing was persisted/);
  assert.deepEqual(inventory(s.storeRoot), before, "dry-run creates zero files");

  const digest = currentDigest(s);
  const wrong = run([
    "truth", "snapshot", ...s.namespaceArgs,
    "--snapshot-id", "snap-x", "--confirm-digest", "sha256:" + "0".repeat(64),
  ]);
  assert.equal(wrong.status, 8, "confirmation mismatch exits 8");
  assert.deepEqual(inventory(s.storeRoot), before, "confirmation mismatch mutates nothing");

  const real = runJson([
    "truth", "snapshot", ...s.namespaceArgs,
    "--snapshot-id", "snap-x", "--confirm-digest", digest,
  ]);
  assert.equal(real.status, 0);
  assert.equal(real.body["snapshot_ref"], "snap-x");
  const stored = s.store.get(WS, BRAND, "claim-snapshot", "snap-x");
  assert.ok(stored.ok, "snapshot persisted through the canonical store");

  const again = run([
    "truth", "snapshot", ...s.namespaceArgs,
    "--snapshot-id", "snap-x", "--confirm-digest", digest,
  ]);
  assert.equal(again.status, 7, "immutable overwrite refusal maps to the conflict exit code");
});

test("analyze persists through the canonical store, reports contradictions with fingerprints, and repeated dry-runs are deterministic", () => {
  const s = cliScenario();
  const one = run(["truth", "analyze", ...s.namespaceArgs, "--profile-ref", "tp_t_0001", "--dry-run"]);
  const two = run(["truth", "analyze", ...s.namespaceArgs, "--profile-ref", "tp_t_0001", "--dry-run"]);
  assert.equal(one.status, 0);
  assert.equal(one.stdout, two.stdout, "dry-run output is deterministic for identical state");
  assert.match(one.stdout, /Open contradictions: 1/);
  assert.match(one.stdout, /fingerprint: c[0-9a-f]{64}/);

  const result = analyzed(s);
  const storedAnalysis = s.store.get(WS, BRAND, "truth-analysis", "ta-cli-1");
  assert.ok(storedAnalysis.ok);
  assert.equal(contentDigest(storedAnalysis.value), result.analysisDigest);
});

test("analyze refuses cross-brand profiles and malformed stored profiles with reference exit codes", () => {
  const s = cliScenario();
  const crossBrand = run([
    "truth", "analyze",
    "--artifacts-root", s.storeRoot, "--workspace", WS, "--brand-ref", "brand_other",
    "--profile-ref", "tp_t_0001", "--dry-run",
  ]);
  assert.equal(crossBrand.status, 3, "cross-brand profile is not found in the foreign namespace");

  // A planted, contract-invalid profile fails closed at the store boundary.
  writeFileSync(
    join(s.storeRoot, WS, BRAND, "truth-profile", "tp-broken.json"),
    JSON.stringify({ schema_version: "1.8.0", artifact_id: "tp-broken" }) + "\n",
    "utf8"
  );
  const malformed = run([
    "truth", "analyze", ...s.namespaceArgs, "--profile-ref", "tp-broken", "--dry-run",
  ]);
  assert.equal(malformed.status, 3);
  assert.ok(!malformed.stderr.includes("    at "), "typed failure, no stack trace");
});

test("prose-only conflicts stay uninterpreted: unstructured claims produce no contradiction", () => {
  const s = cliScenario([
    factClaim("claim-prose-a", "unused", {
      artifact_id: "claim-prose-a",
      statement: "The brand was founded in 2001",
      fact_key: undefined,
      normalized_value: undefined,
      normalization_basis: undefined,
    }),
    factClaim("claim-prose-b", "unused", {
      artifact_id: "claim-prose-b",
      statement: "The brand was founded in 2019",
      fact_key: undefined,
      normalized_value: undefined,
      normalization_basis: undefined,
    }),
  ]);
  const dry = runJson(["truth", "analyze", ...s.namespaceArgs, "--profile-ref", "tp_t_0001", "--dry-run"]);
  assert.equal(dry.status, 0);
  assert.deepEqual(dry.body["open_contradictions"], []);
  assert.equal((dry.body["unstructured_claim_refs"] as string[]).length, 2);
});

// ---------------------------------------------------------------------------
// Inspect
// ---------------------------------------------------------------------------
test("truth inspect is read-only, reports currency vs staleness, and never prints claim statements", () => {
  const s = cliScenario();
  const { fingerprint } = analyzed(s);
  assert.ok(fingerprint.length > 0);
  const before = inventory(s.storeRoot);
  const current = run(["truth", "inspect", ...s.namespaceArgs, "--analysis-ref", "ta-cli-1"]);
  assert.equal(current.status, 0);
  assert.match(current.stdout, /current \(matches the live namespace\)/);
  assert.match(current.stdout, new RegExp(fingerprint));
  assert.ok(
    !current.stdout.includes("The company operates in Dubai"),
    "claim statement bodies are never printed by default"
  );
  assert.deepEqual(inventory(s.storeRoot), before, "inspect creates zero files");

  const added = s.store.put(WS, BRAND, "claim", factClaim("claim-late", "Gamma Brand"));
  assert.ok(added.ok);
  const stale = runJson(["truth", "inspect", ...s.namespaceArgs, "--analysis-ref", "ta-cli-1"]);
  assert.equal(stale.status, 0);
  assert.equal(stale.body["stale"], true);
});

// ---------------------------------------------------------------------------
// Resolution prepare
// ---------------------------------------------------------------------------
test("prepare derives losers, persists the exact decision, and prints a sign template with a key placeholder", () => {
  const s = cliScenario();
  const { analysisDigest, fingerprint } = analyzed(s);
  const before = inventory(s.storeRoot);

  const dry = run([
    "resolution", "prepare", ...s.namespaceArgs,
    "--analysis-ref", "ta-cli-1", "--fact-key", "identity.primary_name",
    "--contradiction-fingerprint", fingerprint, "--winner", "claim-keep",
    "--requester-id", SUBJECT, "--rationale", "keep the alpha value", "--dry-run",
  ]);
  assert.equal(dry.status, 0);
  assert.match(dry.stdout, /DRY RUN/);
  assert.deepEqual(inventory(s.storeRoot), before, "prepare dry-run mutates nothing");

  const decisionDigest = prepared(s, analysisDigest, fingerprint);
  const stored = s.store.get(WS, BRAND, "fact-resolution-decision", "frd-cli-1");
  assert.ok(stored.ok);
  assert.equal(contentDigest(stored.value), decisionDigest, "printed digest is the stored bytes' digest");
  assert.deepEqual(
    (stored.value["losing_claims"] as { claim_ref: string }[]).map((l) => l.claim_ref),
    ["claim-drop"],
    "losers are re-derived by the preparation service"
  );

  const json = runJson(["resolution", "inspect", ...s.namespaceArgs, "--decision-ref", "frd-cli-1"]);
  assert.equal(json.status, 0);
  // Template checks run against the prepare output itself.
  const prep = runJson([
    "resolution", "prepare", ...s.namespaceArgs,
    "--analysis-ref", "ta-cli-1", "--fact-key", "identity.primary_name",
    "--contradiction-fingerprint", fingerprint, "--winner", "claim-keep",
    "--requester-id", SUBJECT, "--rationale", "keep the alpha value", "--dry-run",
  ]);
  const signTemplate = String(prep.body["sign_command_template"]);
  assert.match(signTemplate, /--private-key <PATH-TO-YOUR-PRIVATE-KEY>/, "placeholder, never a real key path");
  assert.match(signTemplate, /--target-type fact-resolution-decision/);
  assert.match(signTemplate, /--gate fact-resolution-approval/);
  assert.ok(!/--private-key \//.test(signTemplate), "no concrete key path is ever guessed");
});

test("prepare refuses operator-supplied losers, wrong winners, wrong fact keys, tampered fingerprints, and stale analyses", () => {
  const s = cliScenario();
  const { analysisDigest, fingerprint } = analyzed(s);
  const base = [
    "resolution", "prepare", ...s.namespaceArgs,
    "--analysis-ref", "ta-cli-1", "--fact-key", "identity.primary_name",
    "--contradiction-fingerprint", fingerprint, "--winner", "claim-keep",
    "--requester-id", SUBJECT, "--rationale", "r", "--decision-id", "frd-x",
    "--confirm-digest", analysisDigest,
  ];

  const losers = run([...base, "--losers", "claim-drop"]);
  assert.equal(losers.status, 2, "a loser-list option does not exist and is refused as unknown");

  const wrongWinner = run(base.map((a) => (a === "claim-keep" ? "claim-nope" : a)));
  assert.equal(wrongWinner.status, 3);

  const wrongKey = run(base.map((a) => (a === "identity.primary_name" ? "identity.legal_name" : a)));
  assert.equal(wrongKey.status, 3);

  const wrongFp = run(base.map((a) => (a === fingerprint ? "c" + "0".repeat(64) : a)));
  assert.equal(wrongFp.status, 3);

  const wrongConfirm = run(base.map((a) => (a === analysisDigest ? "sha256:" + "1".repeat(64) : a)));
  assert.equal(wrongConfirm.status, 8);
  assert.equal(s.store.get(WS, BRAND, "fact-resolution-decision", "frd-x").ok, false, "nothing persisted");

  const added = s.store.put(WS, BRAND, "claim", factClaim("claim-late", "Gamma Brand"));
  assert.ok(added.ok);
  const stale = run(base);
  assert.equal(stale.status, 4, "stale analysis maps to the stale exit code");
});

// ---------------------------------------------------------------------------
// Resolution apply
// ---------------------------------------------------------------------------
test("apply accepts no private-key option and refuses malformed or wrong-namespace evidence", () => {
  const s = cliScenario();
  const withKey = run([
    "resolution", "apply", ...s.namespaceArgs,
    "--receipts-root", s.receiptsRoot, "--evidence", "x.json",
    "--confirm-digest", "sha256:" + "0".repeat(64),
    "--private-key", "/anywhere/key.pem",
  ]);
  assert.equal(withKey.status, 2);
  assert.match(withKey.stderr, /unknown option '--private-key'/);

  const malformedPath = join(tempDir("nabcorcli-badevidence"), "evidence.json");
  writeFileSync(malformedPath, "{not json", "utf8");
  const malformed = run([
    "resolution", "apply", ...s.namespaceArgs,
    "--receipts-root", s.receiptsRoot, "--evidence", malformedPath,
    "--confirm-digest", "sha256:" + "0".repeat(64),
  ]);
  assert.equal(malformed.status, 2);
});

test("the full synthetic operator workflow: analyze, prepare, personally sign with an ephemeral key, apply, replay, inspect — with zero private material in any output", () => {
  const s = cliScenario();
  const outputs: string[] = [];
  const capture = (r: CliRun): CliRun => {
    outputs.push(r.stdout, r.stderr);
    return r;
  };

  // 1. status
  assert.equal(capture(run(["status"])).status, 0);
  // 2-3. snapshot digest + analyze
  const { analysisDigest, fingerprint } = analyzed(s);
  // 4. inspect
  assert.equal(capture(run(["truth", "inspect", ...s.namespaceArgs, "--analysis-ref", "ta-cli-1"])).status, 0);
  // 5. prepare
  const decisionDigest = prepared(s, analysisDigest, fingerprint);
  // Before signing: inspect must NOT claim any consumption from shape alone.
  const setup = signingSetup();
  const preEvidence = capture(
    run(["resolution", "inspect", ...s.namespaceArgs, "--decision-ref", "frd-cli-1"])
  );
  assert.match(preEvidence.stdout, /Application: none found/);
  // 6. the key owner personally signs (ephemeral key, isolated config)
  const evidencePath = sign(s, setup, "frd-cli-1", "approved", "evidence.json");
  const unconsumed = capture(
    run([
      "resolution", "inspect", ...s.namespaceArgs,
      "--decision-ref", "frd-cli-1", "--evidence", evidencePath, "--receipts-root", s.receiptsRoot,
    ])
  );
  assert.match(unconsumed.stdout, /not consumed/);
  assert.match(unconsumed.stdout, /shape alone authorizes nothing/);
  // 7. apply public evidence
  const applied = capture(run(applyArgs(s, evidencePath, decisionDigest, setup.configDir)));
  assert.equal(applied.status, 0, applied.stderr);
  assert.match(applied.stdout, /Resolution applied exactly once/);
  assert.match(applied.stdout, /verification_status contradicted/);
  // 8. idempotent replay
  const replay = capture(run(applyArgs(s, evidencePath, decisionDigest, setup.configDir)));
  assert.equal(replay.status, 0);
  assert.match(replay.stdout, /idempotent replay/);
  // 9. completion inspect + old-analysis staleness
  const completed = capture(
    run([
      "resolution", "inspect", ...s.namespaceArgs,
      "--decision-ref", "frd-cli-1", "--evidence", evidencePath, "--receipts-root", s.receiptsRoot,
    ])
  );
  assert.match(completed.stdout, /completed \(immutable application record exists\)/);
  assert.match(completed.stdout, /stale \(expected/);
  const staleOld = runJson(["truth", "inspect", ...s.namespaceArgs, "--analysis-ref", "ta-cli-1"]);
  outputs.push(JSON.stringify(staleOld.body));
  assert.equal(staleOld.body["stale"], true, "old analysis is stale after application");

  // Zero private material in every captured output channel.
  const pem = readFileSync(setup.privateKeyPath, "utf8");
  const armor = ["PRIVATE", "KEY"].join(" ");
  for (const channel of outputs) {
    assert.ok(!channel.includes(armor), "no PEM armor in any CLI output");
    for (const line of pem.split("\n")) {
      if (line.length > 10 && !line.startsWith("-----")) {
        assert.ok(!channel.includes(line), "no private key body in any CLI output");
      }
    }
  }
});

test("rejected evidence consumes but mutates no claim; the rejection is reported under the rejection exit code", () => {
  const s = cliScenario();
  const { analysisDigest, fingerprint } = analyzed(s);
  const decisionDigest = prepared(s, analysisDigest, fingerprint);
  const setup = signingSetup();
  const evidencePath = sign(s, setup, "frd-cli-1", "rejected", "rejected.json");
  const claimsBefore = inventory(join(s.storeRoot, WS, BRAND, "claim"));
  const rejected = run(applyArgs(s, evidencePath, decisionDigest, setup.configDir));
  assert.equal(rejected.status, 6);
  assert.match(rejected.stderr, /resolution-rejected/);
  assert.deepEqual(inventory(join(s.storeRoot, WS, BRAND, "claim")), claimsBefore, "zero claim mutation");

  const inspect = run([
    "resolution", "inspect", ...s.namespaceArgs,
    "--decision-ref", "frd-cli-1", "--evidence", evidencePath, "--receipts-root", s.receiptsRoot,
  ]);
  assert.match(inspect.stdout, /rejected \(consumed; an authentic rejection applies nothing\)/);
});

test("wrong-target, unenrolled-key, expired, and cross-namespace evidence all fail with their documented exit codes", () => {
  const s = cliScenario();
  const { analysisDigest, fingerprint } = analyzed(s);
  const decisionDigest = prepared(s, analysisDigest, fingerprint);
  const setup = signingSetup();

  // Wrong target type: evidence over the ANALYSIS is not a resolution authorization.
  const analysis = s.store.get(WS, BRAND, "truth-analysis", "ta-cli-1");
  assert.ok(analysis.ok);
  const candidate = JSON.parse(
    readFileSync(join(setup.configDir, "authority-registry.active.json"), "utf8")
  ) as { authorities: { key_id: string }[] };
  const policy = JSON.parse(
    readFileSync(join(setup.configDir, "human-gate-policy.active.json"), "utf8")
  ) as Record<string, unknown>;
  const pem = readFileSync(setup.privateKeyPath, "utf8");
  const payloadBase = {
    payload_type: APPROVAL_PAYLOAD_TYPE,
    payload_version: APPROVAL_PAYLOAD_VERSION,
    domain: APPROVAL_DOMAIN,
    approval_id: "appr-cli-x",
    workspace: WS,
    brand_ref: BRAND,
    target_artifact_type: "truth-analysis",
    target_artifact_ref: "ta-cli-1",
    target_artifact_digest: contentDigest(analysis.value),
    gate: "fact-resolution-approval",
    verdict: "approved",
    reason: "wrong-target synthetic evidence",
    requester_id: SUBJECT,
    approver_id: SUBJECT,
    role: "product-owner",
    self_review: true,
    key_id: candidate.authorities[0]!.key_id,
    policy_ref: String(policy["policy_id"]),
    policy_version: policy["policy_version"],
    nonce: "ab".repeat(16),
    issued_at: new Date(Date.now() - 60_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    expires_at: new Date(Date.now() + 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  const wrongTargetEvidence = {
    schema_version: "1.8.0",
    evidence_id: "apev-cli-wrongtarget",
    payload: payloadBase,
    payload_digest: approvalPayloadDigest(payloadBase),
    signature: { algorithm: "ed25519", signature_b64: signApprovalPayload(payloadBase, pem) },
  };
  const wrongTargetPath = join(setup.evidenceDir, "wrong-target.json");
  writeFileSync(wrongTargetPath, JSON.stringify(wrongTargetEvidence, null, 2) + "\n", "utf8");
  const wrongTarget = run(applyArgs(s, wrongTargetPath, decisionDigest, setup.configDir));
  assert.equal(wrongTarget.status, 3, "signing an analysis authorizes no application");

  // Expired evidence: valid shape, dead window.
  const expiredPayload = {
    ...payloadBase,
    target_artifact_type: "fact-resolution-decision",
    target_artifact_ref: "frd-cli-1",
    target_artifact_digest: decisionDigest,
    approval_id: "appr-cli-exp",
    nonce: "cd".repeat(16),
    issued_at: "2026-01-01T00:00:00Z",
    expires_at: "2026-01-01T01:00:00Z",
  };
  const expiredEvidence = {
    schema_version: "1.8.0",
    evidence_id: "apev-cli-expired",
    payload: expiredPayload,
    payload_digest: approvalPayloadDigest(expiredPayload),
    signature: { algorithm: "ed25519", signature_b64: signApprovalPayload(expiredPayload, pem) },
  };
  const expiredPath = join(setup.evidenceDir, "expired.json");
  writeFileSync(expiredPath, JSON.stringify(expiredEvidence, null, 2) + "\n", "utf8");
  const expired = run(applyArgs(s, expiredPath, decisionDigest, setup.configDir));
  assert.equal(expired.status, 5, "expired evidence denies under the authorization exit code");

  // Unenrolled key: same evidence against the COMMITTED active registry
  // (the ephemeral key is not enrolled there).
  const realConfig = run(applyArgs(s, expiredPath, decisionDigest, join(repoRoot, "contracts")).slice(0, -2));
  assert.equal(realConfig.status, 5);

  // Cross-namespace: evidence is signed for ws_test; applying under another
  // workspace fails before any store access.
  const good = sign(s, setup, "frd-cli-1", "approved", "cross-ns.json");
  const crossNs = run([
    "resolution", "apply",
    "--artifacts-root", s.storeRoot, "--workspace", "ws_other", "--brand-ref", BRAND,
    "--receipts-root", s.receiptsRoot, "--evidence", good,
    "--confirm-digest", decisionDigest, "--trusted-config-dir", setup.configDir,
  ]);
  assert.equal(crossNs.status, 3);
  assert.match(crossNs.stderr, /signed for namespace/);
});

test("an interrupted application resumes through the CLI, and a same-nonce replay for a different decision conflicts", () => {
  const s = cliScenario();
  const { analysisDigest, fingerprint } = analyzed(s);
  const decisionDigest = prepared(s, analysisDigest, fingerprint);
  const setup = signingSetup();
  const evidencePath = sign(s, setup, "frd-cli-1", "approved", "resume.json");

  // Simulate a crash: consume in-process, then let the CLI finish the job.
  const loaded = loadTrustedAuthorityConfig(
    join(setup.configDir, "human-gate-policy.active.json"),
    join(setup.configDir, "authority-registry.active.json"),
    registry()
  );
  assert.ok(loaded.ok);
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as Record<string, unknown>;
  const consumed = verifyAndConsumeApproval(evidence, {
    contracts: registry(),
    artifactStore: s.store,
    receiptStore: new FileApprovalReceiptStore(s.receiptsRoot, registry()),
    config: loaded.value,
    clock: () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  });
  assert.ok(consumed.ok, JSON.stringify(consumed));

  const recoverable = run([
    "resolution", "inspect", ...s.namespaceArgs,
    "--decision-ref", "frd-cli-1", "--evidence", evidencePath, "--receipts-root", s.receiptsRoot,
  ]);
  assert.match(recoverable.stdout, /recoverable \(consumed but incomplete/);

  const resumed = run(applyArgs(s, evidencePath, decisionDigest, setup.configDir));
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.match(resumed.stdout, /Resolution applied exactly once/);

  // Same nonce, different signed content: the receipt refuses the operation.
  const payload = (evidence as { payload: Record<string, unknown> }).payload;
  const foreignPayload = { ...payload, reason: "a different signed reason" };
  const pem = readFileSync(setup.privateKeyPath, "utf8");
  const foreignEvidence = {
    schema_version: "1.8.0",
    evidence_id: "apev-cli-foreign",
    payload: foreignPayload,
    payload_digest: approvalPayloadDigest(foreignPayload),
    signature: { algorithm: "ed25519", signature_b64: signApprovalPayload(foreignPayload, pem) },
  };
  const foreignPath = join(setup.evidenceDir, "foreign.json");
  writeFileSync(foreignPath, JSON.stringify(foreignEvidence, null, 2) + "\n", "utf8");
  const conflicted = run(applyArgs(s, foreignPath, decisionDigest, setup.configDir));
  assert.equal(conflicted.status, 7);
});

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
test("namespace traversal is refused and fake approval metadata on artifacts grants nothing", () => {
  const s = cliScenario();
  const traversal = run([
    "truth", "snapshot",
    "--artifacts-root", s.storeRoot, "--workspace", "../escape", "--brand-ref", BRAND,
    "--dry-run",
  ]);
  assert.equal(traversal.status, 3);
  assert.match(traversal.stderr, /unsafe workspace identifier/);

  // A decision carrying a legacy envelope `approvals` entry is unauthenticated
  // metadata: inspect still reports no consumption and no application.
  const { analysisDigest, fingerprint } = analyzed(s);
  prepared(s, analysisDigest, fingerprint);
  const stored = s.store.get(WS, BRAND, "fact-resolution-decision", "frd-cli-1");
  assert.ok(stored.ok);
  const withFakeApproval = {
    ...stored.value,
    artifact_id: "frd-cli-fake",
    approvals: [
      { approved_by: "attacker", gate: "fact-resolution-approval", verdict: "approved", at: "2026-07-19T12:00:00Z" },
    ],
  };
  const put = s.store.put(WS, BRAND, "fact-resolution-decision", withFakeApproval);
  assert.ok(put.ok, JSON.stringify(put));
  const inspect = run(["resolution", "inspect", ...s.namespaceArgs, "--decision-ref", "frd-cli-fake"]);
  assert.equal(inspect.status, 0);
  assert.match(inspect.stdout, /Application: none found/);
  assert.ok(!/consumed|authorized|approved by/i.test(inspect.stdout.replace(/no evidence supplied/i, "")), "unsigned metadata never reads as authorization");
});

test("the nabcor CLI reads no environment variables and has no private-key surface", () => {
  const source = readFileSync(join(repoRoot, "src", "cli", "nabcor.ts"), "utf8");
  assert.ok(!/process\.env/.test(source), "nabcor.ts must not read environment variables");
  // No command registers a private-key option: the only occurrence of the
  // flag text is inside the printed sign-approval TEMPLATE (with a
  // placeholder), never in a registered flag list or a value read.
  assert.ok(!source.includes('"--private-key"'), "no registered --private-key option exists");
  assert.ok(!/createPrivateKey|readFileSync\([^)]*key/i.test(source), "no key material is ever read");
});
