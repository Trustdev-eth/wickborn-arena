#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

SRC="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$HOME/clashlings-contracts-build"
echo "HOME=$HOME"
echo "solana=$(command -v solana)"
echo "cargo-build-sbf=$(command -v cargo-build-sbf)"
solana --version
cargo-build-sbf --version

echo "syncing sources to $BUILD"
mkdir -p "$BUILD"
rsync -a --delete --exclude target --exclude adapter/node_modules --exclude .anchor "$SRC/" "$BUILD/"
cd "$BUILD"

echo "host tests"
cargo test --manifest-path programs/clashlings/Cargo.toml --lib

echo "building sbf"
cargo-build-sbf --manifest-path programs/clashlings/Cargo.toml --sbf-sdk "$HOME/.local/share/solana/install/active_release/bin/sdk/sbf" --tools-version v1.57

mkdir -p "$SRC/target/deploy" "$SRC/adapter/idl"
cp -f target/deploy/clashlings.so "$SRC/target/deploy/clashlings.so"
if [[ -f target/idl/clashlings.json ]]; then
  cp -f target/idl/clashlings.json "$SRC/adapter/idl/clashlings.json"
elif command -v node >/dev/null; then
  (cd "$SRC/adapter" && node src/generate-idl.mjs)
fi
ls -lh "$SRC/target/deploy/clashlings.so"
echo "BUILD_OK"
