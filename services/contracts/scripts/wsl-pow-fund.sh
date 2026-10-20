#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAYER="$ROOT/adapter/.dev-keypair.json"
RPC="https://api.devnet.solana.com"
PUB=$(solana-keygen pubkey "$PAYER")
echo "payer $PUB"
solana balance "$PAYER" --url "$RPC" || true
if ! command -v devnet-pow >/dev/null; then
  echo "installing devnet-pow"
  cargo install devnet-pow --locked
fi
devnet-pow --help | head -n 40 || true
# Several small PoW rewards; stop early if the wallet is funded.
for i in 1 2 3 4 5 6 7 8; do
  echo "pow attempt $i"
  devnet-pow mine --keypair "$PAYER" --url "$RPC" -d 3 --reward 0.25 --no-infer -t 8000000000 || \
    devnet-pow mine -d 3 --reward 0.25 --no-infer -t 8000000000 || true
  solana balance "$PAYER" --url "$RPC" || true
done
solana balance "$PAYER" --url "$RPC"
echo "POW_DONE"
