#!/usr/bin/env bash
# Convenience script: bootstrap the project then start frontend + backend
# dev servers together. Equivalent to `pnpm dev`.
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm bootstrap
pnpm --parallel --filter ./app/** dev
