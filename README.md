# ArkAdmin

ArkAdmin is a web-based "Control Plane" for the [Bark](https://gitlab.com/ark-bitcoin/bark) Bitcoin Wallet Daemon. It allows users to visualize their node status, manage balances, and interact with the Ark Layer 2 protocol via a modern GUI.

## Architecture

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Shadcn/UI.
- **Backend:** Next.js API Routes (BFF Pattern).
- **Integration:** Connects to `barkd` (Rust) via the official TypeScript SDK.
- **Network:** Bitcoin Signet.