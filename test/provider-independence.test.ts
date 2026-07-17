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

test("package.json declares no runtime dependencies and no provider SDKs", () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(pkg.dependencies, undefined, "the kernel must have zero runtime dependencies");
  const allowedDev = new Set(["@types/node", "ajv", "ajv-formats", "typescript"]);
  for (const dep of Object.keys(pkg.devDependencies ?? {})) {
    assert.ok(allowedDev.has(dep), `unexpected dev dependency '${dep}' requires a decision record`);
  }
});
