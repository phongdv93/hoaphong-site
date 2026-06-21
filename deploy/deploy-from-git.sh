#!/bin/bash
# Deploy trên VPS — git pull + build + PM2 (giữ .env hiện có)
set -eu
cd /var/www/hoaphong-site
sed -i 's/\r$//' deploy/*.sh deploy/*.cjs 2>/dev/null || true

git pull origin main

npm install
npm run build

pm2 restart hoaphong-site --update-env
pm2 save

echo "OK — $(curl -sI http://127.0.0.1:3002 | head -1)"
