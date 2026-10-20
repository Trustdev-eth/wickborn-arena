#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

SRC="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$HOME/clashlings-contracts-build"
SO_SRC="$SRC/target/deploy/clashlings.so"
RPC="https://api.devnet.solana.com"

if [[ ! -f "$SO_SRC" ]]; then
  echo "missing $SO_SRC" >&2
  exit 1
fi
if [[ ! -f "$SRC/.program-keypair.json" || ! -f "$SRC/adapter/.dev-keypair.json" ]]; then
  echo "missing program or payer keypair" >&2
  exit 1
fi

mkdir -p "$BUILD/target/deploy" "$BUILD/adapter"
cp -f "$SO_SRC" "$BUILD/target/deploy/clashlings.so"
cp -f "$SRC/.program-keypair.json" "$BUILD/.program-keypair.json"
cp -f "$SRC/adapter/.dev-keypair.json" "$BUILD/adapter/.dev-keypair.json"

SO="$BUILD/target/deploy/clashlings.so"
PROGRAM_KP="$BUILD/.program-keypair.json"
PAYER_KP="$BUILD/adapter/.dev-keypair.json"

echo "payer $(solana-keygen pubkey "$PAYER_KP")"
echo "program $(solana-keygen pubkey "$PROGRAM_KP")"
solana balance "$PAYER_KP" --url "$RPC"
ls -lh "$SO"

solana program deploy "$SO" \
  --url "$RPC" \
  --keypair "$PAYER_KP" \
  --program-id "$PROGRAM_KP" \
  --commitment finalized

solana program show "$(solana-keygen pubkey "$PROGRAM_KP")" --url "$RPC" --keypair "$PAYER_KP"
echo "DEPLOY_OK"
