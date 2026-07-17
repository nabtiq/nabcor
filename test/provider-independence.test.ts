// INV-PROV-001 grep gate: the deterministic kernel must contain no provider SDK
// imports and no direct network or model-call capability.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./helpers.js";

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: "provider SDK import", re: /from\s+["'](?:@anthropic-ai\/|openai|@openai\/|@google\/|googleapis|@aws-sdk\/|cohere|groq|mistral|ollama)/ },
  { name: "http/https module", re: /["'](?:node:)?https?["']/ },
  { name: "net/tls/dgram module", re: /["'](?:node:)?(?:net|tls|dgram|http2)["']/ },
  { name: "fetch call", re: /\bfetch\s*\(/ },
  { name: "XMLHttpRequest", re: /XMLHttpRequest/ },
  { name: "undici/axios/got client", re: /["'](?:undici|axios|got|node-fetch)["']/ },
  { name: "WebSocket", re: /\bWebSocket\b/ },
];

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
  for (const file of files) {
    const body = readFileSync(file, "utf8");
    for (const { name, re } of FORBIDDEN) {
      assert.ok(!re.test(body), `${file} matches forbidden pattern: ${name}`);
    }
  }
});

test("package.json declares exactly the approved dependency boundary (DEC-0006)", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  // The kernel validates contracts with Ajv at runtime, so ajv and ajv-formats
  // are runtime dependencies — exactly these two, nothing else, and neither is a
  // provider SDK or an application/agent framework.
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
