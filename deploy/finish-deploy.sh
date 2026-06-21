#!/bin/bash
set -eu
cd /var/www/hoaphong-site
sed -i 's/\r$//' deploy/ecosystem.config.cjs deploy/nginx-ip-coexist.conf 2>/dev/null || true

node -e "
const fs=require('fs');
let t=fs.readFileSync('.env','utf8');
const line=t.match(/^DATABASE_URL=(.+)$/m)?.[1]||'';
if(!line.includes('hoaphong:')||line.includes('postgres:@')){
  t=t.replace(/^DATABASE_URL=.*/m,'DATABASE_URL=postgresql://hoaphong:yVKoEwoVQB5SAdkJBQGNDsQ8@127.0.0.1:5432/erp');
  fs.writeFileSync('.env',t);
}
"

npm run db:seed
npm run build

export PATH="$PATH:/usr/local/bin:$HOME/.npm-global/bin"
npm install -g pm2 2>/dev/null || sudo npm install -g pm2

HOAPHONG_PORT=3002 pm2 delete hoaphong-site 2>/dev/null || true
HOAPHONG_PORT=3002 pm2 start deploy/ecosystem.config.cjs
pm2 save

sudo cp deploy/nginx-ip-coexist.conf /etc/nginx/sites-available/hoaphong
sudo ln -sf /etc/nginx/sites-available/hoaphong /etc/nginx/sites-enabled/hoaphong
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 8080/tcp 2>/dev/null || true

echo "=== HEALTH ==="
sleep 2
curl -sI http://127.0.0.1:3002 | head -1
curl -sI http://127.0.0.1:8080 | head -1
pm2 status
