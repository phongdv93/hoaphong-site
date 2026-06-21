#!/bin/bash
# Reset công ty + tenant DB trên VPS (giữ admin@hoaphong.vn)
set -eu

echo "==> Drop tenant databases..."
for db in $(sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'erp_t_%'"); do
  echo "  drop $db"
  sudo -u postgres dropdb --if-exists "$db"
done

echo "==> Clear platform company data..."
sudo -u postgres psql erp -f /var/www/hoaphong-site/deploy/reset-companies.sql

echo "==> Done. Users left:"
sudo -u postgres psql erp -c "SELECT id, email FROM users ORDER BY id;"
