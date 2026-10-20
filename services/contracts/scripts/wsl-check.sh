#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
echo "HOME=$HOME"
echo "uname=$(uname -a)"
command -v solana
command -v cargo-build-sbf
command -v cargo
solana --version
cargo-build-sbf --version
ls -la "$(cd "$(dirname "$0")/.." && pwd)/.program-keypair.json"
echo "CHECK_OK"
