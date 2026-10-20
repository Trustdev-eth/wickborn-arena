#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAYER="$ROOT/adapter/.dev-keypair.json"
RPC="https://api.devnet.solana.com"
PUB=$(solana-keygen pubkey "$PAYER")
echo "payer $PUB"
solana balance "$PAYER" --url "$RPC" || true
solana airdrop 2 "$PUB" --url "$RPC" || true
solana airdrop 1 "$PUB" --url "$RPC" || true
solana balance "$PAYER" --url "$RPC"
echo "AIRDROP_DONE"
