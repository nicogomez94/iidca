#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
remote_app="/var/www/sites/iidca-social-club/app"

# The remote site user can write only inside IIDCA's application directory.
rsync -az \
  --exclude '/.git/' \
  --exclude '/node_modules/' \
  --exclude '/dist/' \
  --exclude '/.env' \
  --exclude '/.env.local' \
  --exclude '*.docx' \
  --exclude '/logo IIDCA SOCIAL CLUB FINAL.png' \
  --rsync-path='runuser -u site-iidca -- rsync' \
  "$project_dir/" "hosting:$remote_app/"

ssh hosting 'bash -se' <<'REMOTE'
set -euo pipefail
app=/var/www/sites/iidca-social-club/app
runuser -u site-iidca -- sh -c "cd '$app' && npm ci && npm run db:generate && npm run db:deploy && VITE_DEBUG=false npm run build"
nginx -t
systemctl restart iidca-social-club.service
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent http://127.0.0.1:3013/api/health >/dev/null; then
    curl --fail --silent https://149.34.224.87/api/health
    exit 0
  fi
  sleep 1
done
systemctl status iidca-social-club.service --no-pager
exit 1
REMOTE
