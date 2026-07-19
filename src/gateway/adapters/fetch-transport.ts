// Production raw-HTTPS transport for the Anthropic Messages API (DEC-0018,
// DEC-0019; threat model T01/T02/T13/T19).
//
// This is the ONLY module in the repository that may call fetch, and the only
// place a provider URL exists. The endpoint is pinned as a module constant —
// there is no base-URL parameter anywhere in the runtime, so no caller,
// configuration file, environment variable, or scenario content can redirect
// a request. Headers are constructed here from exactly the required set; a
// caller cannot add, remove, or override any header. Node built-in fetch only:
// no provider SDK and no new runtime dependency (DEC-0006 boundary).
//
// Reaching this module at all requires every earlier gate to pass: adapter
// policy validation, live-invocation state, live-call authorization, budget
// reservation, and credential resolution. In this phase those gates cannot
// all pass in any committed configuration (live invocation is schema-pinned
// disabled and no credential exists), so this transport is production-present
// but unreachable — CONFIGURED_BUT_LIVE_DISABLED.
import {
  MAX_RESPONSE_BYTES,
  type AnthropicTransport,
  type TransportRequest,
  type TransportResult,
} from "./transport.js";

/** The pinned production endpoint (provider-policy-candidate api_endpoint). */
export const ANTHROPIC_MESSAGES_ENDPOINT = "https://api.anthropic.com/v1/messages";

export class FetchAnthropicTransport implements AnthropicTransport {
  async post(request: TransportRequest): Promise<TransportResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch(ANTHROPIC_MESSAGES_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": request.apiKey,
          "anthropic-version": request.apiVersion,
        },
        body: request.bodyJson,
        signal: controller.signal,
        redirect: "error",
      });
      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        return {
          ok: false,
          failure: {
            kind: "transport-response-too-large",
            message: `response content-length ${contentLength} exceeds the ${MAX_RESPONSE_BYTES}-byte cap`,
          },
        };
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_RESPONSE_BYTES) {
        return {
          ok: false,
          failure: {
            kind: "transport-response-too-large",
            message: `response body of ${buffer.byteLength} bytes exceeds the ${MAX_RESPONSE_BYTES}-byte cap`,
          },
        };
      }
      const retryAfterRaw = response.headers.get("retry-after");
      const retryAfterParsed = retryAfterRaw === null ? NaN : Number(retryAfterRaw);
      return {
        ok: true,
        response: {
          status: response.status,
          contentType: (response.headers.get("content-type") ?? "").toLowerCase(),
          retryAfterSeconds:
            Number.isFinite(retryAfterParsed) && retryAfterParsed >= 0 ? retryAfterParsed : null,
          requestId: response.headers.get("request-id"),
          bodyText: Buffer.from(buffer).toString("utf8"),
        },
      };
    } catch (e) {
      // Redacted by construction: only the error class name is carried —
      // never the message, which could embed request details.
      const name = e instanceof Error ? e.name : "unknown";
      if (name === "AbortError") {
        return {
          ok: false,
          failure: {
            kind: "transport-timeout",
            message: `request aborted after ${request.timeoutMs} ms`,
          },
        };
      }
      return {
        ok: false,
        failure: {
          kind: "transport-network-error",
          message: `network failure (${name})`,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
