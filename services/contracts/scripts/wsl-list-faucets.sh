#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
devnet-pow get-all-faucets -k "$ROOT/adapter/.dev-keypair.json" -u https://api.devnet.solana.com -c confirmed
echo LIST_DONE
