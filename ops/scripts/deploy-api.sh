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

previous_release=
if [[ -e $current_link && ! -L $current_link ]]; then
  echo "Current release path exists but is not a symbolic link." >&2
  exit 65
fi
if [[ -L $current_link ]]; then
  previous_release=$(readlink -f "$current_link") || {
    echo "Current release link cannot be resolved." >&2
    exit 65
  }
  if [[ ! -d $previous_release || $previous_release != "$releases_root/"* ]]; then
    echo "Current release link does not resolve inside the releases directory." >&2
    exit 65
  fi
fi
install -d -o lop-sach -g lop-sach "$release_dir"
tar -xzf "$archive" -C "$release_dir"
chown -R lop-sach:lop-sach "$release_dir"

if [[ ! -f $release_dir/apps/api/dist/server.js || ! -f $release_dir/apps/api/dist/cli/migrate.js ]]; then
  echo "Release artifact does not contain the prebuilt API and migration CLI." >&2
  exit 65
fi
(
  cd "$release_dir"
  sudo -u lop-sach corepack pnpm install --frozen-lockfile --prod
)

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

if ! wait_for_readiness; then
  if [[ -n $previous_release && -d $previous_release ]]; then
    rollback_link=$app_root/.rollback-$release_id
    ln -s "$previous_release" "$rollback_link"
    mv -Tf "$rollback_link" "$current_link"
    systemctl restart lop-sach-api.service
    if ! wait_for_readiness; then
      echo "Readiness failed for both the new and restored releases." >&2
      exit 1
    fi
  else
    rm -f -- "$current_link"
    systemctl stop lop-sach-api.service
  fi
  echo "Readiness failed; active code was restored when a previous release existed." >&2
  exit 1
fi

echo "Activated release $release_id"
