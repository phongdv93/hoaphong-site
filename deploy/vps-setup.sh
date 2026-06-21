#!/bin/bash
# Chạy trên VPS sau khi copy code vào /var/www/hoaphong-site
#
# VPS đã có web khác (mặc định):
#   sudo bash deploy/vps-setup.sh
#
# VPS trống, muốn chiếm cổng 80:
#   COEXIST=0 sudo bash deploy/vps-setup.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/hoaphong-site}"
PUBLIC_IP="${PUBLIC_IP:-23.142.84.59}"
COEXIST="${COEXIST:-1}"
APP_PORT="${HOAPHONG_PORT:-3002}"
NGINX_PORT="${NGINX_PUBLIC_PORT:-8080}"
DB_USER="${DB_USER:-hoaphong}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48)}"

if [ "$COEXIST" = "1" ]; then
  PUBLIC_URL="http://${PUBLIC_IP}:${NGINX_PORT}"
else
  PUBLIC_URL="http://${PUBLIC_IP}"
  APP_PORT="3000"
  NGINX_PORT="80"
fi

echo "==> Cài Node 20 (+ Postgres nếu chưa có)..."
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y nginx postgresql || true

echo "==> Tạo database erp (bỏ qua nếu đã có)..."
if command -v psql >/dev/null; then
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' CREATEDB;"
  sudo -u postgres psql -c "ALTER USER ${DB_USER} CREATEDB;" 2>/dev/null || true
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='erp'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE erp OWNER ${DB_USER};"
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/erp
POSTGRES_ADMIN_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/postgres
JWT_SECRET=${JWT_SECRET}
NEXT_PUBLIC_APP_URL=${PUBLIC_URL}
ERP_HTTP=1
ADMIN_EMAIL=admin@hoaphong.vn
ADMIN_PASSWORD=DoiMatKhauAdmin123!
COMPANY_VERIFY_RULES_ONLY=1
EOF
  echo "==> Đã tạo .env — LƯU mật khẩu DB: ${DB_PASS}"
else
  echo "==> Giữ .env hiện có (kiểm tra NEXT_PUBLIC_APP_URL=${PUBLIC_URL})"
fi

echo "==> npm install + build..."
if [ "$(id -u)" = "0" ] && [ -n "${SUDO_USER:-}" ]; then
  chown -R "${SUDO_USER}:${SUDO_USER}" "$APP_DIR"
  sudo -u "${SUDO_USER}" bash -lc "cd '$APP_DIR' && npm install && npm run db:create-erp || true && npm run db:seed && npm run build"
else
  npm install
  npm run db:create-erp || true
  npm run db:seed
  npm run build
fi

echo "==> PM2 (port nội bộ ${APP_PORT})..."
npm install -g pm2 2>/dev/null || true
RUN_USER="${SUDO_USER:-ubuntu}"
if [ "$(id -u)" = "0" ]; then
  sudo -u "$RUN_USER" env HOAPHONG_PORT="${APP_PORT}" pm2 delete hoaphong-site 2>/dev/null || true
  sudo -u "$RUN_USER" env HOAPHONG_PORT="${APP_PORT}" pm2 start deploy/ecosystem.config.cjs
  sudo -u "$RUN_USER" pm2 save
  sudo env PATH="$PATH" pm2 startup systemd -u "$RUN_USER" --hp "/home/$RUN_USER" 2>/dev/null || true
else
  HOAPHONG_PORT="${APP_PORT}" pm2 delete hoaphong-site 2>/dev/null || true
  HOAPHONG_PORT="${APP_PORT}" pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi

echo "==> Nginx (KHÔNG ghi đè site cũ)..."
if [ "$COEXIST" = "1" ]; then
  cp deploy/nginx-ip-coexist.conf /etc/nginx/sites-available/hoaphong
  ln -sf /etc/nginx/sites-available/hoaphong /etc/nginx/sites-enabled/hoaphong
else
  cp deploy/nginx-ip.conf /etc/nginx/sites-available/hoaphong
  ln -sf /etc/nginx/sites-available/hoaphong /etc/nginx/sites-enabled/hoaphong
fi
nginx -t
systemctl reload nginx

echo "==> Firewall (mở cổng public ${NGINX_PORT})..."
ufw allow OpenSSH 2>/dev/null || true
ufw allow "${NGINX_PORT}"/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || true

echo ""
echo "============================================"
echo " XONG! (coexist=${COEXIST})"
echo "   ${PUBLIC_URL}/"
echo "   ${PUBLIC_URL}/erp/login"
echo "   ${PUBLIC_URL}/erp/register"
echo " App nội bộ: 127.0.0.1:${APP_PORT}"
echo " 2 web cũ trên cổng 80 — không bị đụng"
echo "============================================"
