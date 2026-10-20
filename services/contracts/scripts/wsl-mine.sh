#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAYER="$ROOT/adapter/.dev-keypair.json"
echo "payer $(solana-keygen pubkey "$PAYER")"
solana balance "$PAYER" --url https://api.devnet.solana.com || true
# Infer available faucets; stop once the wallet has ~3 SOL for program deploy.
devnet-pow mine -k "$PAYER" -u https://api.devnet.solana.com --target-lamports 3000000000
echo "MINE_DONE"
solana balance "$PAYER" --url https://api.devnet.solana.com
