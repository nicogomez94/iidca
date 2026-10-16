#!/usr/bin/env bash
set -euo pipefail

# Installs a timer exclusively for IIDCA's database and directory.
ssh hosting 'bash -se' <<'REMOTE'
set -euo pipefail
install -d -o site-iidca -g site-iidca -m 0700 /var/www/sites/iidca-social-club/shared/backups
cat > /usr/local/sbin/iidca-social-club-backup <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
backup_dir=/var/www/sites/iidca-social-club/shared/backups
backup_file="$backup_dir/iidca-$(date -u +%Y%m%d-%H%M%S).dump"
trap 'rm -f "$backup_file"' ERR
runuser -u site-iidca -- bash -c '
  set -euo pipefail
  set -a
  source /var/www/sites/iidca-social-club/shared/app.env
  pg_url="$(node -e '\''const url = new URL(process.env.DATABASE_URL); url.searchParams.delete("schema"); process.stdout.write(url.href)'\'')"
  pg_dump --format=custom --no-owner --no-privileges --file="$1" "$pg_url"
' _ "$backup_file"
runuser -u site-iidca -- pg_restore --list "$backup_file" >/dev/null
find "$backup_dir" -maxdepth 1 -type f -name 'iidca-*.dump' -size 0 -delete
find "$backup_dir" -maxdepth 1 -type f -name 'iidca-*.dump' -mtime +14 -delete
SCRIPT
chmod 0750 /usr/local/sbin/iidca-social-club-backup
cat > /etc/systemd/system/iidca-social-club-backup.service <<'SERVICE'
[Unit]
Description=IIDCA Social Club PostgreSQL backup
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/iidca-social-club-backup
SERVICE
cat > /etc/systemd/system/iidca-social-club-backup.timer <<'TIMER'
[Unit]
Description=Daily IIDCA Social Club backup

[Timer]
OnCalendar=*-*-* 03:45:00
Persistent=true
RandomizedDelaySec=15min

[Install]
WantedBy=timers.target
TIMER
systemctl daemon-reload
systemctl enable --now iidca-social-club-backup.timer
systemctl start iidca-social-club-backup.service
systemctl is-active iidca-social-club-backup.timer
find /var/www/sites/iidca-social-club/shared/backups -maxdepth 1 -type f -name 'iidca-*.dump' -printf '%f %s bytes\n'
REMOTE
