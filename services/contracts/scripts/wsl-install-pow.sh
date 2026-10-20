#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
# Unlocked so wasm-bindgen can move past 0.2.86, which fails on current rustc.
cargo install devnet-pow
devnet-pow --help | head -n 30
echo "POW_INSTALLED"
