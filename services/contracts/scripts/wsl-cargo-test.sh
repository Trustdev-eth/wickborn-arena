#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$HOME/clashlings-contracts-build"
echo "syncing $SRC -> $BUILD"
mkdir -p "$BUILD"
rsync -a --exclude target --exclude adapter/node_modules --exclude .anchor "$SRC/" "$BUILD/"
cd "$BUILD/programs/clashlings"
cargo test --lib
echo "CARGO_TEST_OK"
