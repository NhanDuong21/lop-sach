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

candidate_link=$app_root/.rollback-$1
ln -s "$release_dir" "$candidate_link"
mv -Tf "$candidate_link" "$current_link"
systemctl restart lop-sach-api.service
curl --fail --silent --show-error --retry 10 --retry-delay 2 --max-time 15 \
  http://127.0.0.1:3000/health/ready >/dev/null
echo "Rolled back application code to $1; no down migration was run."
