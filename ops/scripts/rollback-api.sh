#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 || ! $1 =~ ^[a-zA-Z0-9._-]{7,80}$ ]]; then
  echo "Usage: rollback-api.sh <existing-release-id>" >&2
  exit 64
fi

app_root=/opt/lop-sach
release_dir=$app_root/releases/$1
current_link=$app_root/current

if [[ ! -d $release_dir ]]; then
  echo "Release does not exist: $1" >&2
  exit 66
fi
if [[ ! -L $current_link ]]; then
  echo "Current release link is missing." >&2
  exit 65
fi
previous_release=$(readlink -f "$current_link") || {
  echo "Current release link cannot be resolved." >&2
  exit 65
}
if [[ ! -d $previous_release || $previous_release != "$app_root/releases/"* ]]; then
  echo "Current release link does not resolve inside the releases directory." >&2
  exit 65
fi

wait_for_readiness() {
  local attempt
  for attempt in {1..30}; do
    if curl --fail --silent --max-time 5 http://127.0.0.1:3000/health/live >/dev/null &&
      curl --fail --silent --max-time 5 http://127.0.0.1:3000/health/ready >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

candidate_link=$app_root/.rollback-$1
ln -s "$release_dir" "$candidate_link"
mv -Tf "$candidate_link" "$current_link"
systemctl restart lop-sach-api.service
if ! wait_for_readiness; then
  restore_link=$app_root/.restore-$1
  ln -s "$previous_release" "$restore_link"
  mv -Tf "$restore_link" "$current_link"
  systemctl restart lop-sach-api.service
  if ! wait_for_readiness; then
    echo "Readiness failed for both the rollback target and restored release." >&2
    exit 1
  fi
  echo "Rollback target failed readiness; previous release was restored." >&2
  exit 1
fi
echo "Rolled back application code to $1; no down migration was run."
