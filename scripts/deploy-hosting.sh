#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
remote_app="/var/www/sites/iidca-social-club/app"
demo_mode="${DEMO_MODE:-true}"
if [[ "$demo_mode" != "true" && "$demo_mode" != "false" ]]; then
  echo "DEMO_MODE debe ser true o false." >&2
  exit 1
fi

if [[ -n "$(git -C "$project_dir" status --porcelain)" ]]; then
  echo "Hay cambios sin commitear. Hacé el commit antes de desplegar." >&2
  exit 1
fi
git -C "$project_dir" push origin main
git -C "$project_dir" push hosting main

# The remote site user can write only inside IIDCA's application directory.
rsync -az \
  --exclude '/.git/' \
  --exclude '/node_modules/' \
  --exclude '/dist/' \
  --exclude '/uploads/' \
  --exclude '/.env' \
  --exclude '/.env.local' \
  --exclude '*.docx' \
  --exclude '/logo IIDCA SOCIAL CLUB FINAL.png' \
  --rsync-path='runuser -u site-iidca -- rsync' \
  "$project_dir/" "hosting:$remote_app/"

ssh hosting "DEMO_MODE=$demo_mode bash -se" <<'REMOTE'
set -euo pipefail
app=/var/www/sites/iidca-social-club/app
environment=/var/www/sites/iidca-social-club/shared/app.env
uploads=/var/www/sites/iidca-social-club/shared/uploads
mkdir -p "$uploads"
chown site-iidca:site-iidca "$uploads"
ln -sfn "$uploads" "$app/uploads"
if grep -q '^DEMO_MODE=' "$environment"; then
  sed -i "s/^DEMO_MODE=.*/DEMO_MODE=$DEMO_MODE/" "$environment"
else
  printf '\nDEMO_MODE=%s\n' "$DEMO_MODE" >> "$environment"
fi
runuser -u site-iidca -- sh -c "cd '$app' && npm ci && npm run db:generate && npm run db:deploy && VITE_DEMO_MODE='$DEMO_MODE' npm run build && npm run db:seed"
ln -sfn "$uploads" "$app/dist/uploads"
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
