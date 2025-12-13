# Developer Experience (DX) Audit: Building on `barkd` Alpha

**Scope:** `barkd` (v0.1.0-beta.4), TypeScript SDK, Signet Network.

## Executive Summary
This report documents the friction points, architectural observations, and bugs encountered while building **ArkAdmin** (a full-lifecycle Control Plane) on top of the Bark Daemon.

**The Goal:** To identify specific barriers that increase "Time-to-Hello-World" for new developers and offer architectural recommendations to streamline ecosystem adoption.

**The Verdict:** The core protocol implementation (Onboarding, Swaps, Unilateral Exits) is cryptographically robust and functional. However, the **Integration Surface** (SDK generation, HTTP norms, and DB stability) presents friction for frontend/product developers.

---

## 1. Onboarding & Configuration
*Objective: Reduce the time from `git clone` to `running daemon`.*

### 🛑 The "Config vs. Flags" Conflict
**Observation:**
The CLI enforces strict exclusivity between configuration files and CLI flags. Running `bark create --ark <url>` throws a hard error if a `config.toml` exists, even if the user intends to overwrite specific values.

**Impact on TTHW:**
This breaks standard DevOps automation patterns (e.g., Docker entrypoint scripts) where environment variables or runtime flags are expected to override defaults. It forces developers to manually purge the filesystem (`rm -rf ~/.bark`) to change networks or ASPs.

**Recommendation:**
Implement a standard configuration hierarchy (Cascading Config):
1.  CLI Flags (Highest Priority)
2.  Environment Variables
3.  Config File (Lowest Priority)

---

## 2. API & SDK Integration
*Objective: Ensure the generated client libraries "just work" out of the box.*

### 🐛 HTTP Method Mismatch (SDK Generation)
**Observation:**
The generated TypeScript SDK (`@second-tech/barkd-rest-client`) generates `GET` requests for specific endpoints (specifically `/api/v1/onchain/addresses/next`), but the `barkd` Axum router demands `POST`.

**Impact on TTHW:**
**High.** A developer using the official SDK hits a `405 Method Not Allowed` error on their very first attempt to generate an address. This looks like a broken server rather than a client mismatch.

**Workaround:**
I implemented a manual `fetch` wrapper server-side to force the correct HTTP verb.

**Recommendation:**
Audit the OpenAPI/Swagger annotations on the Rust structs. Ensure mutations (creating addresses) are explicitly tagged as `POST` so the generator outputs correct code.

### 📉 The "Blind" Transaction History
**Observation:**
The endpoint `GET /api/v1/onchain/transactions` returns `TransactionInfo` objects containing only `txid` and `tx` (raw hex).

**Impact:**
A frontend developer cannot display "Amount Received" or "Date" without installing heavy crypto libraries (`bitcoinjs-lib`) to decode the raw hex client-side. This bloats the frontend and increases complexity.

**Recommendation:**
Enrich the API response to include computed metadata:
*   `amount_sat` (Integer)
*   `fee_sat` (Integer)
*   `confirmation_time` (Unix Timestamp, if mined)

---

## 3. Stability & Persistence
*Objective: Ensure data consistency during development cycles.*

### 💥 SQLite Schema Drift
**Observation:**
During Unilateral Exit testing, the daemon logs began spamming warnings, and the History endpoint returned `500 Internal Server Error`:
> `Invalid column type Integer at index: 8, name: created_at`

**Diagnosis:**
Logs reported `Invalid column type Integer` on the `created_at` field, indicating the application expected a String. However, a forensic check of a freshly initialized database shows this field is now stored as `DATETIME` (ISO String).

**Impact:**
The binary lacks a migration strategy to convert existing data, causing a hard crash for users updating from a previous nightly build without wiping their data directory.

### 👻 Unilateral Exit Visibility
**Observation:**
When a Unilateral Exit is triggered, the VTXO is correctly removed from `/wallet/vtxos`. However, the "Sweep" transaction does not appear in `/onchain/utxos` until confirmation, and the `exits/progress` endpoint does not always expose the Sweep TXID immediately.

**Impact:**
Users panic that their funds are gone. They have been removed from L2 but are not yet visible on L1.

**Recommendation:**
Expose the `sweep_txid` in the `/exits/progress` state object as soon as it enters the mempool. This allows UIs to render a "View on Explorer" link immediately, maintaining user trust.

---

## 4. What Worked Well (The Happy Path)
Despite the alpha friction, the core engineering is impressive:

1.  **Unilateral Exits:** The mechanism works exactly as advertised. I successfully forced an exit and swept funds without ASP cooperation.
2.  **ASP Reliability:** The Public Signet ASP (`ark.signet.2nd.dev`) was responsive and handled round aggregation reliably.
3.  **Performance:** `barkd` is lightweight and responsive, making it easy to containerize alongside the UI.

---

## Conclusion
The core protocol logic within `barkd` is robust; critical mechanisms like Unilateral Exits and Round Aggregation function exactly as advertised on Signet.

The friction points identified in this report are primarily located in the **integration surface**—specifically the generated SDK, database migrations, and configuration patterns. These are solvable engineering hurdles, not fundamental protocol flaws.

Stabilizing these integration points will significantly lower the barrier to entry, allowing the next wave of application developers to build on top of Ark with confidence.