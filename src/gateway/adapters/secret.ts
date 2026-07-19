// Provider secret boundary (DEC-0019; packet section 8; threat model T01/T02).
//
// The canonical store for the future Anthropic API key is the macOS Keychain
// under the policy-bound service/account identifiers pinned in the signed
// provider-policy-candidate. Rules, all fail-closed:
//   - The key is NEVER read from the repository, configuration files,
//     fixtures, argv, or process environment — the environment is only ever
//     the child-process injection RESULT of an approved source, never the
//     canonical store, and this resolver does not read it at all.
//   - Resolution happens ONLY after every non-secret authorization and budget
//     check passed (enforced by the adapter's gate ordering).
//   - The secret exists in memory for request construction only; it is never
//     persisted, logged, or included in any error, and no length, prefix,
//     suffix, hash, or equality diagnostic is ever emitted.
//   - Non-macOS platforms and a missing Keychain entry fail closed with a
//     typed failure carrying no secret-shaped detail.
//
// No credential is provisioned in this phase (provider-operational-state pins
// credential_provisioned: false); the documented future provisioning command
// (placeholders only, run personally by the Product Owner, never by an agent):
//   security add-generic-password -s nabcor-anthropic-api-key -a nabcor \
//     -w <API-KEY-ENTERED-INTERACTIVELY> -U
import { execFile } from "node:child_process";
import { platform } from "node:os";

export interface SecretResolution {
  /** The resolved API key. Callers must not persist, log, or echo it. */
  apiKey: string;
}

export type SecretResult =
  | { ok: true; value: SecretResolution }
  | { ok: false; message: string };

export interface ProviderSecretResolver {
  resolve(): Promise<SecretResult>;
}

export class KeychainSecretResolver implements ProviderSecretResolver {
  readonly #service: string;
  readonly #account: string;

  /** Service/account come from the validated signed candidate only. */
  constructor(service: string, account: string) {
    this.#service = service;
    this.#account = account;
  }

  resolve(): Promise<SecretResult> {
    if (platform() !== "darwin") {
      return Promise.resolve({
        ok: false,
        message: "keychain secret resolution is only supported on macOS; failing closed",
      });
    }
    return new Promise((resolvePromise) => {
      execFile(
        "/usr/bin/security",
        ["find-generic-password", "-s", this.#service, "-a", this.#account, "-w"],
        { timeout: 10_000, maxBuffer: 4096 },
        (error, stdout) => {
          if (error) {
            // The security tool's stderr is never echoed: it can contain
            // keychain paths. Only the fact of failure is reported.
            resolvePromise({
              ok: false,
              message: `no credential is resolvable from the keychain service '${this.#service}'; failing closed`,
            });
            return;
          }
          const key = stdout.replace(/\n$/, "");
          if (key.length === 0) {
            resolvePromise({
              ok: false,
              message: `keychain service '${this.#service}' returned an empty credential; failing closed`,
            });
            return;
          }
          resolvePromise({ ok: true, value: { apiKey: key } });
        }
      );
    });
  }
}
