#!/usr/bin/env bash
set -Eeuo pipefail

: "${LOP_SACH_TOPOLOGY_WEB_ORIGIN:?Set the deployed frontend origin}"
: "${LOP_SACH_TOPOLOGY_API_ORIGIN:?Set the deployed API origin}"
: "${LOP_SACH_SMOKE_USERNAME:?Set the smoke owner username outside Git}"
: "${LOP_SACH_SMOKE_PASSWORD:?Set the smoke owner password outside Git}"

if [[ $LOP_SACH_TOPOLOGY_WEB_ORIGIN != https://* || $LOP_SACH_TOPOLOGY_API_ORIGIN != https://* ]]; then
  echo "Topology smoke origins must use HTTPS." >&2
  exit 64
fi

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
corepack pnpm --filter @lop-sach/web test:topology
