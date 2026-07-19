// Narrow provider transport boundary (DEC-0019, threat model T01/T02/T03).
//
// The transport interface is deliberately minimal: a caller can supply ONLY
// the serialized request body, the resolved API key, the pinned protocol
// version, and a timeout. There is no URL parameter and no header map — the
// production transport pins the endpoint as a module constant and constructs
// the exact required header set itself, so neither a caller nor a compromised
// scenario can redirect the request (SSRF) or inject headers. Tests inject
// mock transports; the production fetch transport is the ONLY module in the
// repository with network capability — enforced by the provider-independence
// boundary test.
export interface TransportRequest {
  /** Serialized JSON request body (already bounded by the adapter). */
  bodyJson: string;
  /** Resolved API key; held in memory for this call only, never logged. */
  apiKey: string;
  /** Pinned anthropic-version header value (policy constant). */
  apiVersion: string;
  /** Abortable timeout for the entire attempt in milliseconds. */
  timeoutMs: number;
}

export interface TransportResponse {
  /** HTTP status code. */
  status: number;
  /** content-type header value, lowercased ("" when absent). */
  contentType: string;
  /** retry-after header value in seconds when present and parseable. */
  retryAfterSeconds: number | null;
  /** provider request-id header when present. */
  requestId: string | null;
  /** Response body bytes decoded as UTF-8, already size-capped by the transport. */
  bodyText: string;
}

/** Typed transport failures; messages never contain bodies, headers, or keys. */
export type TransportFailure =
  | { kind: "transport-timeout"; message: string }
  | { kind: "transport-network-error"; message: string }
  | { kind: "transport-response-too-large"; message: string };

export type TransportResult =
  | { ok: true; response: TransportResponse }
  | { ok: false; failure: TransportFailure };

export interface AnthropicTransport {
  post(request: TransportRequest): Promise<TransportResult>;
}

/** Upper bound on response bytes read before parsing (threat T13). */
export const MAX_RESPONSE_BYTES = 2_000_000;
