// Provider budget ledger (DEC-0018 ceilings; DEC-0019; threat model T14/T15).
//
// Enforces the ratified USD ceilings — per request, per workflow run, per UTC
// day, per UTC month — with conservative pre-invocation reservation and
// post-invocation settlement, under the documented single-writer boundary
// (DEC-0016 single-host assumption). All arithmetic is integer cents.
//
// Rules:
//   - A reservation is written atomically (tmp + hard link, born complete)
//     under an exclusive ledger lock; a concurrent reservation attempt is
//     refused with a typed failure rather than raced.
//   - An unsettled reservation counts as fully spent forever: a crash between
//     reservation and settlement never releases budget (conservative).
//   - Settlement can only reduce the charged amount to the provider-reported
//     actual cost, never below zero and never above the reservation; unknown
//     usage (timeout) settles at the full reservation.
//   - Settlement is idempotent: re-settling with identical content succeeds
//     (crash-recovery safe); conflicting content is a typed failure.
//   - Day/month attribution comes from the injected clock's ISO string (UTC),
//     so rollovers are deterministic under test.
import { existsSync, linkSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";

export interface BudgetCeilings {
  perRequestCents: number;
  perRunCents: number;
  perDayCents: number;
  perMonthCents: number;
}

export interface BudgetRemaining {
  runCents: number;
  dayCents: number;
  monthCents: number;
}

export interface ReservationScope {
  runId: string;
  requestId: string;
  attempt: number;
  maxCents: number;
}

export type LedgerResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: "budget-exceeded" | "budget-ledger-busy" | "budget-ledger-conflict" | "io-error"; message: string };

interface LedgerEntry {
  reservation_id: string;
  run_id: string;
  request_id: string;
  attempt: number;
  reserved_cents: number;
  day: string;
  month: string;
}

interface SettlementEntry {
  reservation_id: string;
  charged_cents: number;
  usage_known: boolean;
}

const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class FileBudgetLedger {
  readonly #root: string;
  readonly #ceilings: BudgetCeilings;

  constructor(root: string, ceilings: BudgetCeilings) {
    this.#root = resolve(root);
    this.#ceilings = ceilings;
  }

  #entriesDir(): string {
    return join(this.#root, "entries");
  }

  #settlementsDir(): string {
    return join(this.#root, "settlements");
  }

  #lockPath(): string {
    return join(this.#root, "ledger.lock");
  }

  /** Charged cents for one reservation: settled actual, else full reservation. */
  #chargedCents(entry: LedgerEntry): number {
    const settlementPath = join(this.#settlementsDir(), `${entry.reservation_id}.json`);
    if (!existsSync(settlementPath)) return entry.reserved_cents;
    try {
      const settlement = JSON.parse(readFileSync(settlementPath, "utf8")) as SettlementEntry;
      return Math.min(Math.max(settlement.charged_cents, 0), entry.reserved_cents);
    } catch {
      return entry.reserved_cents;
    }
  }

  #loadEntries(): LedgerEntry[] {
    if (!existsSync(this.#entriesDir())) return [];
    const out: LedgerEntry[] = [];
    for (const file of readdirSync(this.#entriesDir())) {
      if (!file.endsWith(".json")) continue;
      try {
        out.push(JSON.parse(readFileSync(join(this.#entriesDir(), file), "utf8")) as LedgerEntry);
      } catch {
        // An unreadable entry cannot be un-charged: treat it as a full
        // per-request reservation so corruption never releases budget.
        out.push({
          reservation_id: file.replace(/\.json$/, ""),
          run_id: "unknown",
          request_id: "unknown",
          attempt: 1,
          reserved_cents: this.#ceilings.perRequestCents,
          day: "unknown",
          month: "unknown",
        });
      }
    }
    return out;
  }

  /** Remaining budget per scope for the given clock instant (never negative). */
  remaining(runId: string, nowIso: string): BudgetRemaining {
    const day = nowIso.slice(0, 10);
    const month = nowIso.slice(0, 7);
    let runSpent = 0;
    let daySpent = 0;
    let monthSpent = 0;
    for (const entry of this.#loadEntries()) {
      const charged = this.#chargedCents(entry);
      if (entry.run_id === runId) runSpent += charged;
      if (entry.day === day) daySpent += charged;
      if (entry.month === month) monthSpent += charged;
    }
    return {
      runCents: Math.max(this.#ceilings.perRunCents - runSpent, 0),
      dayCents: Math.max(this.#ceilings.perDayCents - daySpent, 0),
      monthCents: Math.max(this.#ceilings.perMonthCents - monthSpent, 0),
    };
  }

  /**
   * Atomically reserve the conservative maximum cost of one attempt. Refuses
   * when any ceiling would be exceeded or when another reservation is in
   * flight (single-writer boundary).
   */
  reserve(scope: ReservationScope, nowIso: string): LedgerResult<{ reservationId: string; remaining: BudgetRemaining }> {
    if (!SAFE.test(scope.runId) || !SAFE.test(scope.requestId)) {
      return { ok: false, kind: "io-error", message: "unsafe ledger identifier" };
    }
    if (!Number.isInteger(scope.maxCents) || scope.maxCents <= 0) {
      return { ok: false, kind: "io-error", message: "reservation must be a positive integer cent amount" };
    }
    if (scope.maxCents > this.#ceilings.perRequestCents) {
      return {
        ok: false,
        kind: "budget-exceeded",
        message: `conservative maximum cost ${scope.maxCents} cents exceeds the per-request ceiling ${this.#ceilings.perRequestCents} cents`,
      };
    }
    mkdirSync(this.#entriesDir(), { recursive: true });
    mkdirSync(this.#settlementsDir(), { recursive: true });
    // Exclusive single-writer lock: exactly one concurrent reservation may
    // scan-and-write; every other attempt is refused, never raced.
    const lockTmp = `${this.#lockPath()}.tmp-${randomUUID()}`;
    try {
      writeFileSync(lockTmp, nowIso, "utf8");
      linkSync(lockTmp, this.#lockPath());
    } catch (e) {
      try {
        unlinkSync(lockTmp);
      } catch {
        // tmp already gone
      }
      if ((e as NodeJS.ErrnoException).code === "EEXIST") {
        return {
          ok: false,
          kind: "budget-ledger-busy",
          message: "another budget reservation is in flight; the single-writer boundary refuses concurrent reservations",
        };
      }
      return { ok: false, kind: "io-error", message: `ledger lock failed: ${String(e)}` };
    }
    try {
      unlinkSync(lockTmp);
    } catch {
      // tmp already gone
    }
    try {
      const before = this.remaining(scope.runId, nowIso);
      if (scope.maxCents > before.runCents) {
        return {
          ok: false,
          kind: "budget-exceeded",
          message: `reserving ${scope.maxCents} cents would exceed the per-run ceiling (remaining ${before.runCents} cents)`,
        };
      }
      if (scope.maxCents > before.dayCents) {
        return {
          ok: false,
          kind: "budget-exceeded",
          message: `reserving ${scope.maxCents} cents would exceed the UTC-day ceiling (remaining ${before.dayCents} cents)`,
        };
      }
      if (scope.maxCents > before.monthCents) {
        return {
          ok: false,
          kind: "budget-exceeded",
          message: `reserving ${scope.maxCents} cents would exceed the UTC-month ceiling (remaining ${before.monthCents} cents)`,
        };
      }
      const reservationId = `res${createHash("sha256")
        .update(`${scope.runId}\n${scope.requestId}\n${scope.attempt}`, "utf8")
        .digest("hex")
        .slice(0, 32)}`;
      const entry: LedgerEntry = {
        reservation_id: reservationId,
        run_id: scope.runId,
        request_id: scope.requestId,
        attempt: scope.attempt,
        reserved_cents: scope.maxCents,
        day: nowIso.slice(0, 10),
        month: nowIso.slice(0, 7),
      };
      const path = join(this.#entriesDir(), `${reservationId}.json`);
      if (existsSync(path)) {
        // Recovery: an identical prior reservation for the same attempt is
        // reused (idempotent); different content is a conflict.
        try {
          const prior = JSON.parse(readFileSync(path, "utf8")) as LedgerEntry;
          if (JSON.stringify(prior) === JSON.stringify(entry)) {
            return { ok: true, value: { reservationId, remaining: this.remaining(scope.runId, nowIso) } };
          }
        } catch {
          // fall through to conflict
        }
        return {
          ok: false,
          kind: "budget-ledger-conflict",
          message: `a different reservation already exists for run '${scope.runId}' request '${scope.requestId}' attempt ${scope.attempt}`,
        };
      }
      const tmp = `${path}.tmp-${randomUUID()}`;
      try {
        writeFileSync(tmp, JSON.stringify(entry, null, 2) + "\n", "utf8");
        linkSync(tmp, path);
      } catch (e) {
        return { ok: false, kind: "io-error", message: `reservation write failed: ${String(e)}` };
      } finally {
        try {
          unlinkSync(tmp);
        } catch {
          // tmp already gone
        }
      }
      return { ok: true, value: { reservationId, remaining: this.remaining(scope.runId, nowIso) } };
    } finally {
      try {
        unlinkSync(this.#lockPath());
      } catch {
        // lock already released
      }
    }
  }

  /**
   * Settle one reservation with the provider-reported actual cost, or at the
   * full reservation when usage is unknown (conservative). Never releases
   * more than provably unused; idempotent on identical retries.
   */
  settle(reservationId: string, actualCents: number | "unknown"): LedgerResult<{ chargedCents: number }> {
    const entryPath = join(this.#entriesDir(), `${reservationId}.json`);
    if (!existsSync(entryPath)) {
      return { ok: false, kind: "io-error", message: `no reservation '${reservationId}' exists to settle` };
    }
    let entry: LedgerEntry;
    try {
      entry = JSON.parse(readFileSync(entryPath, "utf8")) as LedgerEntry;
    } catch (e) {
      return { ok: false, kind: "io-error", message: `reservation '${reservationId}' unreadable: ${String(e)}` };
    }
    const charged =
      actualCents === "unknown"
        ? entry.reserved_cents
        : Math.min(Math.max(Math.ceil(actualCents), 0), entry.reserved_cents);
    const settlement: SettlementEntry = {
      reservation_id: reservationId,
      charged_cents: charged,
      usage_known: actualCents !== "unknown",
    };
    const path = join(this.#settlementsDir(), `${reservationId}.json`);
    if (existsSync(path)) {
      try {
        const prior = JSON.parse(readFileSync(path, "utf8")) as SettlementEntry;
        if (JSON.stringify(prior) === JSON.stringify(settlement)) {
          return { ok: true, value: { chargedCents: charged } };
        }
      } catch {
        // fall through to conflict
      }
      return {
        ok: false,
        kind: "budget-ledger-conflict",
        message: `reservation '${reservationId}' is already settled with different content; double settlement is refused`,
      };
    }
    const tmp = `${path}.tmp-${randomUUID()}`;
    try {
      mkdirSync(this.#settlementsDir(), { recursive: true });
      writeFileSync(tmp, JSON.stringify(settlement, null, 2) + "\n", "utf8");
      linkSync(tmp, path);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") {
        return {
          ok: false,
          kind: "budget-ledger-conflict",
          message: `reservation '${reservationId}' was settled concurrently`,
        };
      }
      return { ok: false, kind: "io-error", message: `settlement write failed: ${String(e)}` };
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        // tmp already gone
      }
    }
    return { ok: true, value: { chargedCents: charged } };
  }
}
