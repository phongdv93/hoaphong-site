# Deploy lên VPS mega-stack-545 (Ubuntu 22.04)

| Thông số | Giá trị |
|----------|---------|
| IP public | **23.142.84.59** |
| SSH | `ubuntu@23.142.84.59` |
| RAM / CPU | 4 GB / 2 vCPU |
| Disk VPS | 100 GB NVMe |
| S3 | 100 GB (backup) |

## VPS đã có 2 web khác

**Không đụng cổng 80.** Hoa Phong chạy riêng:

| | |
|---|---|
| Cổng public (tester vào) | **8080** |
| App nội bộ (PM2) | **3002** |
| 2 web cũ | giữ nguyên cổng 80 |

## Link cho tester

- Website: http://23.142.84.59:8080/
- ERP login: http://23.142.84.59:8080/erp/login
- Đăng ký công ty: http://23.142.84.59:8080/erp/register
- Portal công ty: http://23.142.84.59:8080/erp/c/&lt;ma-cty&gt;
- NV đăng ký: http://23.142.84.59:8080/erp/dang-ky?tenant=&lt;subdomain-cty&gt;

---

## Bước 1 — Từ máy Windows: đưa code lên VPS

```powershell
ssh ubuntu@23.142.84.59 "sudo mkdir -p /var/www/hoaphong-site && sudo chown ubuntu:ubuntu /var/www/hoaphong-site"

cd D:\MyPython\HOAPHONG-SITE
tar --exclude=node_modules --exclude=.next --exclude=.git -czf hoaphong.tgz .
scp hoaphong.tgz ubuntu@23.142.84.59:/var/www/hoaphong-site/

ssh ubuntu@23.142.84.59 "cd /var/www/hoaphong-site && tar -xzf hoaphong.tgz && rm hoaphong.tgz"
```

---

## Bước 2 — Trên VPS: cài (mặc định coexist)

```bash
ssh ubuntu@23.142.84.59
cd /var/www/hoaphong-site
sudo bash deploy/vps-setup.sh
```

Script **không ghi đè** nginx site cũ — chỉ thêm file `sites-enabled/hoaphong` listen **8080**.

Nếu cổng 8080 hoặc 3002 đã bị app khác dùng:

```bash
HOAPHONG_PORT=3005 NGINX_PUBLIC_PORT=8088 sudo bash deploy/vps-setup.sh
# Nhớ sửa NEXT_PUBLIC_APP_URL trong .env cho khớp cổng public
```

---

## Bước 3 — Kiểm tra

```bash
pm2 status
curl -I http://127.0.0.1:3002
curl -I http://23.142.84.59:8080
```

Đăng nhập admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env`.

---

## Kiểm tra port trước khi cài (tùy chọn)

```bash
sudo ss -tlnp | grep -E ':80|:8080|:3000|:3001|:3002'
pm2 list
```

---

## 100 GB S3

Upload hiện lưu trên disk VPS. S3 dùng backup DB/upload (xem README / rclone).

---

## Lệnh hữu ích

```bash
pm2 logs hoaphong-site
pm2 restart hoaphong-site
cd /var/www/hoaphong-site && npm run build && pm2 restart hoaphong-site
```

## Bảo mật

- Đổi `ADMIN_PASSWORD` và `JWT_SECRET` trong `.env`.
- Mở firewall cổng 8080: `sudo ufw allow 8080/tcp`
