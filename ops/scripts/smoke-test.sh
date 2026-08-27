#!/usr/bin/env bash
set -Eeuo pipefail

: "${LOP_SACH_WEB_ORIGIN:?Set LOP_SACH_WEB_ORIGIN to the HTTPS frontend origin}"
: "${LOP_SACH_API_ORIGIN:?Set LOP_SACH_API_ORIGIN to the HTTPS API origin}"

if [[ $LOP_SACH_WEB_ORIGIN != https://* || $LOP_SACH_API_ORIGIN != https://* ]]; then
  echo "Smoke-test origins must use HTTPS." >&2
  exit 64
fi

curl --fail --silent --show-error --max-time 15 "$LOP_SACH_WEB_ORIGIN/" >/dev/null
curl --fail --silent --show-error --max-time 15 "$LOP_SACH_API_ORIGIN/health/live" >/dev/null
curl --fail --silent --show-error --max-time 15 "$LOP_SACH_API_ORIGIN/health/ready" >/dev/null

headers_file=$(mktemp)
trap 'rm -f "$headers_file"' EXIT
status=$(curl --silent --show-error --max-time 15 -D "$headers_file" -o /dev/null \
  -w '%{http_code}' "$LOP_SACH_WEB_ORIGIN/api/v1/auth/me")
if [[ $status != 401 ]]; then
  echo "Expected unauthenticated auth/me to return 401, got $status." >&2
  exit 1
fi
if ! grep -Eiq '^cache-control:[[:space:]]*no-store' "$headers_file"; then
  echo "API response is missing Cache-Control: no-store." >&2
  exit 1
fi

echo "Public liveness, readiness, frontend and no-store smoke checks passed."
