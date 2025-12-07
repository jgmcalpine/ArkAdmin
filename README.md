# ArkAdmin

ArkAdmin is a web-based "Control Plane" for the [Bark](https://gitlab.com/ark-bitcoin/bark) Bitcoin Wallet Daemon. It allows users to visualize their node status, manage balances, and interact with the Ark Layer 2 protocol via a modern GUI.

## Architecture

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Shadcn/UI.
- **Backend:** Next.js API Routes (BFF Pattern).
- **Integration:** Connects to `barkd` (Rust) via the official TypeScript SDK.
- **Network:** Bitcoin Signet.

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
