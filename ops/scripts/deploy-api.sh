#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: deploy-api.sh <release-archive.tar.gz> <release-id>" >&2
  exit 64
fi

archive=$1
release_id=$2
app_root=/opt/lop-sach
releases_root=$app_root/releases
current_link=$app_root/current
env_file=/etc/lop-sach/api.env

if [[ ! $release_id =~ ^[a-zA-Z0-9._-]{7,80}$ ]]; then
  echo "Release ID is invalid." >&2
  exit 64
fi
if [[ ! -f $archive || ! -f $env_file ]]; then
  echo "Release archive or environment file is missing." >&2
  exit 66
fi

release_dir=$releases_root/$release_id
if [[ -e $release_dir ]]; then
  echo "Release already exists: $release_id" >&2
  exit 73
fi

previous_release=$(readlink -f "$current_link" 2>/dev/null || true)
install -d -o lop-sach -g lop-sach "$release_dir"
tar -xzf "$archive" -C "$release_dir"
chown -R lop-sach:lop-sach "$release_dir"

if [[ ! -f $release_dir/apps/api/dist/server.js || ! -f $release_dir/apps/api/dist/cli/migrate.js ]]; then
  echo "Release artifact does not contain the prebuilt API and migration CLI." >&2
  exit 65
fi
sudo -u lop-sach corepack pnpm --dir "$release_dir" install --frozen-lockfile --prod

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a
export NODE_ENV=production
sudo -u lop-sach --preserve-env=NODE_ENV,MONGODB_URI,APP_ORIGIN,LOG_LEVEL,LOP_SACH_PROXY_SECRET \
  /usr/bin/node "$release_dir/apps/api/dist/cli/migrate.js"

next_link=$app_root/.current-$release_id
ln -s "$release_dir" "$next_link"
mv -Tf "$next_link" "$current_link"
systemctl restart lop-sach-api.service

if ! curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3000/health/ready >/dev/null; then
  if [[ -n $previous_release && -d $previous_release ]]; then
    rollback_link=$app_root/.rollback-$release_id
    ln -s "$previous_release" "$rollback_link"
    mv -Tf "$rollback_link" "$current_link"
    systemctl restart lop-sach-api.service
  fi
  echo "Readiness failed; active code was restored when a previous release existed." >&2
  exit 1
fi

echo "Activated release $release_id"
