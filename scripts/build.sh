#!/usr/bin/env bash
# Convenience script: type-check and build both frontend and backend
# for production. Equivalent to `pnpm build`.
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm typecheck
pnpm build:frontend
pnpm build:backend
echo "Build complete. Run 'pnpm package' to produce distributable binaries."
