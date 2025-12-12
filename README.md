# ArkAdmin

ArkAdmin is a modern, web-based Control Plane for [barkd](https://gitlab.com/ark-bitcoin/bark) (the Bark Wallet Daemon). It provides a visual interface for the Ark Layer 2 Protocol, enabling users to seamlessly swap between L1 and L2, monitor VTXO expirations, and perform trustless unilateral exits without touching the command line.

## Architecture

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Shadcn/UI.
- **Backend:** Next.js API Routes (BFF Pattern).
- **Integration:** Connects to `barkd` (Rust) via the official TypeScript SDK.
- **Network:** Bitcoin Signet.

## Project Structure

- `/`: Admin Dashboard (Management & Logistics)
- `/pos`: Point of Sale Terminal (Kiosk Mode)

## Test Drive: A Walkthrough
If you have the application running (see Installation below), follow this path to verify the entire lifecycle of an Ark Transaction.

**1. The Onboarding (Funding)**
- Navigate to the Dashboard.
- Click Receive.
- Select the Bitcoin (L1) tab.
- Copy the address (tb1...) and send 50,000 sats from a Signet Faucet.
- You can fund your Ark wallet in the same way or Onboard in step 2.

Verification: Wait for 1 confirmation. You will see the funds appear in the Bitcoin Balance card and the On-Chain History table.

**2. The Swap (L1 to L2)**
- Navigate to the Coins page via the sidebar and click Onboard.
- Enter 20,000 sats.
- Click Send Now.

Verification: Your Bitcoin Balance will decrease, and your Ark Balance will increase after a block is mined (the VTXO will be locked in the meantime). You have successfully "lifted" funds off-chain.

**3. The Management (Coin Control)**
- You will see your active VTXOs. Note the Expiry Date; this is when your funds would technically timelock if not refreshed.
- Click the Refresh icon on a coin to manually cycle it in the next Round.

Verification: Refresh the page after a few minutes, notice the expiry date update. After Refreshing the VTXO you will see the expiry date reset.

**4. Collaborative Exit (Standard Offboard)**
- The "Happy Path" for leaving.
- On the Coins page, find a "Spendable" VTXO.
- Click the Log Out (Exit) icon in the Actions column.

Verification: The coin enters a Round. Once the round confirms, the funds move seamlessly to your Bitcoin Balance without complex timelocks. This is the cheapest way to exit.

**5. Emergency Exit (Unilateral Redemption)**
- On the Coins page, look for the red "Emergency Exit" button at the top.
- Click it and confirm the dialog warning.

Verification: All coins will vanish from L2. A "Recovering Funds" card will appear at the top showing "Timelock Active." After the timelock expires (24h+ on Mainnet, usually less on Signet) and you sweep the funds, they will return to your On-Chain History on the Dashboard.

## Requirements

Before running this project, ensure your environment meets the following criteria. This is an advanced implementation that interacts with alpha-stage Bitcoin software and modern frontend standards.

### System & Environment

- **OS:** macOS or Linux (Windows WSL2 is supported but untested).
- **Node.js:** v18.17 or higher (Required for Next.js 15).
- **Tailwind CSS:** v3.4 or higher.

> **Note:** This project uses modern utility classes like "size-4" and arbitrary CSS variable values. If you are porting this code, ensure your Tailwind configuration is up to date.

### The Bark Daemon (Critical)

ArkAdmin is a control plane; it requires the underlying engine (barkd) to be running. You must build this from source.

- **Rust Toolchain:** Nightly (Required for "edition2024" features).
- **System Tools:** protobuf (Required for compiling gRPC definitions).
  - **macOS:** `brew install protobuf`
  - **Linux:** `apt install protobuf-compiler`

## Getting Started

### 1. Setup the Bark Daemon

Since barkd is not yet distributed as a binary, you must compile it locally.

**Clone the repository:**

```bash
git clone https://gitlab.com/ark-bitcoin/bark.git
cd bark
```

**Configure Rust Nightly (Required):**

```bash
rustup override set nightly
rustup update
```

**Build the Release Binary:**

```bash
cargo build --release
```

**Initialize wallet (Critical)**
Create a new wallet connected to the public Signet ASP and Mempool explorer.

```bash
./target/release/bark create --signet --ark https://ark.signet.2nd.dev --esplora 
https://mempool.space/signet/api
```

**Run the Daemon:**

This will start the daemon on Port 3000 (Default)

```bash
./target/release/barkd
```

> **Note:** Keep this terminal window open.

### 2. Setup ArkAdmin (This Repo)

**Clone and Install:**

```bash
git clone https://github.com/jgmcalpine/ArkAdmin.git
cd ArkAdmin
npm install
```

> **Note:** This will install the Bark SDK from the local .tgz file included in the repo.

**Configure Environment:**

Copy the example configuration to your local environment file.

```bash
cp .env.example .env.local
```

Verify `.env.local` contains:

```env
BARKD_URL="http://127.0.0.1:3000"
```

**Run the Application:**

```bash
npm run dev
```

The application will start on Port 3001 to avoid conflicting with the daemon.

Open http://localhost:3001 in your browser.
