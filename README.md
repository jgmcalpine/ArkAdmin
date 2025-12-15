# bArk Suite

A unified ecosystem of tools built for **`barkd`** (The Bark Wallet Daemon), designed to make the Ark Layer 2 Protocol accessible for Operators, Merchants, and Developers.

## The Suite

This repository contains three distinct applications operating as a Monorepo:

### 1. ArkAdmin (Control Plane)
**Audience:** Node Operators ("Uncle Jim")
**Purpose:** A visual dashboard to manage liquidity, inspect VTXOs, and perform trustless exits.
*   **Features:** L1/L2 Balance tracking, VTXO Lifecycle Management (Refresh/Expiry), Unilateral Exit ("Panic Button"), and Auto-Sync Heartbeat.

### 2. ArkPOS (Point of Sale)
**Audience:** Merchants & Retail Staff
**Purpose:** A touch-friendly, kiosk-mode PWA for accepting payments in a physical store.
*   **Features:** Zero-Config Inbound Liquidity (via Ark), Lightning Network compatibility, PIN-Locked Exit.

### 3. ArkFetch (Developer Platform)
**Audience:** App Developers
**Purpose:** A self-hosted Payment Processor API (like Stripe for Ark).
*   **Features:** REST API (`POST /charges`), Webhook Dispatcher, API Key Authentication, SQLite persistence.

---

## Architecture

*   **Pattern:** **BFF (Backend for Frontend)** via Next.js Server Actions.
*   **Stack:** Next.js 15 (App Router), Tailwind CSS, Shadcn/UI, Prisma (SQLite).
*   **Integration:** Connects to a local or remote `barkd` instance via gRPC/HTTP.
*   **Network:** Bitcoin Signet.

---

## Test Drive: A Full-Lifecycle Walkthrough

Follow this path to verify the entire Ark protocol lifecycle across all three apps.

### Phase 1: The Operator (ArkAdmin)
**1. Funding (Onboarding)**
*   Navigate to **Dashboard**. Click **Receive** -> **Bitcoin (L1)**.
*   Send 50,000 sats from a Signet Faucet. Wait for 1 confirmation.
*   Go to **Coins** page -> Click **Deposit / Onboard**. Swap 20,000 sats to L2.

**2. Management (Coin Control)**
*   In **Coins**, view your active VTXOs. Note the **Expiry Date**.
*   Click the **Refresh** icon to cycle a coin in the next Round.

**3. The Exit (Unilateral Redemption)**
*   *The "Trustless Guarantee".* On the Coins page, click the red **Emergency Exit** button.
*   *Verification:* Funds vanish from L2. The "Recovering Funds" card tracks the Timelock. Once expired, click **Claim Funds** to sweep back to L1.

### Phase 2: The Merchant (ArkPOS)
**1. Setup**
*   Navigate to `/pos` (or click "Launch POS" in sidebar).
*   Add to Home Screen (Mobile/Tablet) for Fullscreen Mode.

**2. The Sale**
*   Enter `5000` sats on the keypad. Tap **Charge**.
*   *Verification:* Scan the QR code with a Lightning Wallet. The screen flashes "Payment Received" instantly.

### Phase 3: The Developer (ArkFetch)
**1. API Access**
*   Generate an API Key: `npx tsx scripts/create-api-key.ts`.
*   Create a Charge via Curl:
    ```bash
    curl -X POST http://localhost:3001/api/v1/charges \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer sk_live_..." \
      -d '{ "amount": 1000, "webhookUrl": "https://webhook.site/..." }'
    ```

**2. The Hosted Page**
*   Visit the returned `payment_url` (e.g., `/pay/cmj...`).
*   Pay the invoice.
*   *Verification:* The webhook fires to your URL, and the database updates to `paid`.

---

## Requirements

*   **OS:** macOS or Linux.
*   **Node.js:** v20+ (Required for Next.js 15).
*   **Rust:** Nightly Toolchain (Required for `barkd`).
*   **System:** Protobuf Compiler (`brew install protobuf`).

---

## Getting Started

### 1. Setup the Bark Daemon
Since `barkd` is alpha, you must build it from source.

**Clone & Build:**
```bash
git clone https://gitlab.com/ark-bitcoin/bark.git
cd bark
rustup override set nightly
cargo build --release
```

**Initialize Wallet (Critical):**
```bash
./target/release/bark create --signet --ark https://ark.signet.2nd.dev --esplora https://mempool.space/signet/api
```

**Run Daemon:**
```bash
./target/release/barkd
```
> **Note:** Keep this terminal window open.

### 2. Setup The Suite (This Repo)

**Install & Configure:**
```bash
git clone https://github.com/jgmcalpine/ArkAdmin.git
cd ArkAdmin
npm install
cp .env.example .env
```
*   *Note:* Ensure `.env` contains `DATABASE_URL` (Absolute Path recommended for SQLite).

**Initialize Database:**
```bash
npx prisma migrate dev --name init
```

**Run Application:**
```bash
npm run dev
```
Open **http://localhost:3001** for Admin, or **/pos** for Terminal.

---

## Production Deployment (Docker)

You can deploy the entire suite as a containerized service.

**1. Build:**
```bash
docker compose build
```

**2. Run:**
```bash
docker compose up -d
```
*   The app runs on Port 3001.
*   Data persists in the `prisma/` volume.
*   It connects to the host `barkd` via `host.docker.internal`.

---

## 🤖 AI-Augmented Development

This project was built using an **AI-First / Pair-Programming workflow**.

-   **The Architect (Human):** Responsible for system design, protocol strategy, debugging network/daemon interactions, and defining the security constraints (e.g., Unilateral Exits).
-   **The Builder (AI):** Responsible for generating the majority of the React components, server actions, and TypeScript definitions based on iterative architectural prompts.

**Methodology:** While the code was machine-generated, every logic flow was manually integrated and tested against the live Bitcoin Signet network to ensure behavior matches the protocol requirements.