// INV-PROV-001 boundary gate (DEC-0009, consciously narrowed by DEC-0018/
// DEC-0019): the runtime must contain no provider SDK import anywhere, and
// network capability may exist ONLY inside the single pinned raw-HTTPS
// transport module of the gateway Anthropic adapter. Every other source file
// stays free of network primitives, so the deterministic kernel, the truth
// pipeline, the authority layer, and the CLIs provably cannot open a network
// path.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers.js";

// The ONLY file permitted to call fetch: the pinned production transport
// (DEC-0019). Adding any other file to this list requires a ratified decision.
const TRANSPORT_MODULE = ["src", "gateway", "adapters", "fetch-transport.ts"].join(sep);

const FORBIDDEN_EVERYWHERE: { name: string; re: RegExp }[] = [
  { name: "provider SDK import", re: /from\s+["'](?:@anthropic-ai\/|openai|@openai\/|@google\/|googleapis|@aws-sdk\/|cohere|groq|mistral|ollama)/ },
  { name: "http/https module", re: /["'](?:node:)?https?["']/ },
  { name: "net/tls/dgram module", re: /["'](?:node:)?(?:net|tls|dgram|http2)["']/ },
  { name: "XMLHttpRequest", re: /XMLHttpRequest/ },
  { name: "undici/axios/got client", re: /["'](?:undici|axios|got|node-fetch)["']/ },
  { name: "WebSocket", re: /\bWebSocket\b/ },
];

const FETCH_CALL = /\bfetch\s*\(/;

function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFilesUnder(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

test("no provider SDK imports or direct network capability exist in the runtime", () => {
  const files = tsFilesUnder(join(repoRoot, "src"));
  assert.ok(files.length >= 6, `expected kernel sources, found ${files.length}`);
  let transportSeen = false;
  for (const file of files) {
    const body = readFileSync(file, "utf8");
    for (const { name, re } of FORBIDDEN_EVERYWHERE) {
      assert.ok(!re.test(body), `${file} matches forbidden pattern: ${name}`);
    }
    if (relative(repoRoot, file) === TRANSPORT_MODULE) {
      transportSeen = true;
      assert.ok(FETCH_CALL.test(body), "the transport module must be the fetch site");
      continue;
    }
    assert.ok(
      !FETCH_CALL.test(body),
      `${file} calls fetch; network capability is confined to ${TRANSPORT_MODULE} (DEC-0019)`
    );
  }
  assert.ok(transportSeen, "the pinned transport module must exist");
});

test("the transport module pins the production endpoint and accepts no caller URL or header map", () => {
  const body = readFileSync(join(repoRoot, TRANSPORT_MODULE), "utf8");
  assert.ok(
    body.includes('"https://api.anthropic.com/v1/messages"'),
    "the production endpoint must be a pinned module constant"
  );
  // Exactly one URL literal exists in the runtime, and it lives here. The
  // allowlist compares the exact HOST of each literal (never a substring
  // match — that is the incomplete-URL-sanitization antipattern, since
  // `nabcor.nabtiq.com.evil.example` or `evil.example/json-schema.org` would
  // slip through a `.includes()` check). Doc/schema-namespace hosts are
  // non-reachable identifiers, not endpoints.
  const DOC_HOSTS = new Set(["nabcor.nabtiq.com", "json-schema.org"]);
  const files = tsFilesUnder(join(repoRoot, "src"));
  const urlPattern = /https:\/\/([a-z0-9.-]+)\//g;
  for (const file of files) {
    const rel = relative(repoRoot, file);
    if (rel === TRANSPORT_MODULE) continue;
    const body = readFileSync(file, "utf8");
    const reachable: string[] = [];
    for (const match of body.matchAll(urlPattern)) {
      if (!DOC_HOSTS.has(match[1]!)) reachable.push(match[0]);
    }
    assert.deepEqual(reachable, [], `${rel} contains a provider-reachable URL literal: ${reachable.join(", ")}`);
  }
  // The transport request shape has no URL or header-map field.
  const transportInterface = readFileSync(join(repoRoot, "src", "gateway", "adapters", "transport.ts"), "utf8");
  assert.ok(!/url\s*:/i.test(transportInterface.replace(/\/\/[^\n]*/g, "")), "TransportRequest must not carry a URL field");
  assert.ok(!/headers\s*:/i.test(transportInterface.replace(/\/\/[^\n]*/g, "")), "TransportRequest must not carry a header map");
});

test("package.json declares exactly the approved dependency boundary (DEC-0006)", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  // The kernel validates contracts with Ajv at runtime, so ajv and ajv-formats
  // are runtime dependencies — exactly these two, nothing else, and neither is a
  // provider SDK or an application/agent framework. The Anthropic adapter uses
  // Node built-in fetch: zero new runtime dependencies (DEC-0018/DEC-0019).
  assert.deepEqual(
    Object.keys(pkg.dependencies ?? {}).sort(),
    ["ajv", "ajv-formats"],
    "runtime dependencies must be exactly ajv and ajv-formats (DEC-0006); anything else requires a decision record"
  );
  assert.deepEqual(
    Object.keys(pkg.devDependencies ?? {}).sort(),
    ["@types/node", "typescript"],
    "dev dependencies must be exactly @types/node and typescript; anything else requires a decision record"
  );
});

test("the authority layer never imports gateway or adapter modules", () => {
  for (const file of tsFilesUnder(join(repoRoot, "src", "authority"))) {
    const body = readFileSync(file, "utf8");
    assert.ok(!/from\s+["'][^"']*gateway/.test(body), `${file} must not import gateway modules`);
    assert.ok(!/adapter/i.test(body.replace(/\/\/[^\n]*/g, "")), `${file} must not reference adapters`);
  }
});
