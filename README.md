# Hoa Phong — Website Giới Thiệu Công Ty

Website giới thiệu công ty **Hoa Phong** và **ERP nội bộ** (tách route), dùng Next.js 15, TypeScript, Tailwind CSS và **PostgreSQL**.

## Cấu trúc URL

| Phần | URL | Mô tả |
|------|-----|--------|
| Website công ty | `/`, `/ve-chung-toi`, … | Công khai |
| ERP hub | `/erp` | Tất cả module |
| Đăng nhập | `/erp/login` | |
| **Kho gỗ** (đang dùng) | `/erp/kho-go` | Nhập kiện, 3D, phát gỗ |
| **Sản phẩm & BOM** | `/erp/san-pham/san-pham` | Ảnh URL, mã, kích thước; BOM 3 phần (gỗ / hardware / bao bì), chi tiết có Dài–Sâu–Cao mm → catalog |
| **Danh mục chi tiết** | `/erp/san-pham/chi-tiet` | Part tái sử dụng từ BOM |
| Kho | `/erp/kho` | Hub: vật tư, sơn, bao bì, TP (stub) |
| Marketing | `/erp/marketing` | KH, đơn hàng, công nợ (stub) |
| Kế toán | `/erp/ke-toan` | Thu/chi, báo cáo (stub) |
| Quản trị | `/erp/quan-tri` | User, phân quyền, duyệt (stub) |
| HR | `/erp/hr` | Nhân sự, chấm công (stub) |
| CMS website | `/erp/admin` | Blog, sản phẩm web |

URL cũ `/admin`, `/kho-go` redirect sang `/erp/...`.

## Cài đặt

### 1. PostgreSQL

```bash
docker compose up -d
```

Hoặc dùng PostgreSQL có sẵn và tạo database `hoaphong`.

### 2. Biến môi trường

Sao chép `.env.example` → `.env`:

```env
DATABASE_URL=postgresql://hoaphong:hoaphong@localhost:5432/hoaphong
JWT_SECRET=your-secret
ADMIN_EMAIL=admin@hoaphong.vn
ADMIN_PASSWORD=admin123
```

### 3. Chạy dự án

```bash
npm install
# Tạo database `erp` trên Postgres 18 (cùng server với DB nesting):
#   PowerShell: $env:PGPASSWORD="mat-khau-postgres"; npm run db:create-erp
#   Hoặc pgAdmin → Query Tool → chạy scripts/create-erp-database.sql
npm run db:seed        # Admin + dữ liệu mẫu (đọc `.env` — không cần export tay DATABASE_URL)
npm run db:reseed      # Cập nhật nội dung marketing (tùy chọn)
npm run db:seed-wood   # Demo kho gỗ
npm run dev
```

- Website: http://localhost:3000  
- ERP: http://localhost:3000/erp  
- Đăng nhập: http://localhost:3000/erp/login  

## Lệnh hữu ích

```bash
npm run dev
npm run build
npm run db:seed
npm run db:seed-wood
# Tạo lại kiện demo:
$env:RECREATE_DEMO="1"; npm run db:seed-wood   # PowerShell
```

## Phòng ban & module ERP

Phòng ban (chưa phân quyền): thiết kế, Marketing, kế toán, nhân sự, kho, ban GĐ, ban QL SX, nhân lao động — xem `src/lib/erp/departments.ts`.

| Module | Trạng thái |
|--------|------------|
| Kho gỗ | Đang dùng |
| Marketing → Khách hàng | Đang dùng (CRUD) |
| **Xuất nhập khẩu** (`/erp/xnk`) | Beta — khai báo nhập VNACCS (IDA/IDC) |
| Các module còn lại | Stub / làm dần |

Làm từng module: thêm bảng trong `schema.sql` → API `/api/...` → trang `/erp/<nhóm>/<sub>` (route tĩnh ưu tiên hơn stub).

### Module Xuất nhập khẩu (VNACCS)

1. Premium bật module **xnk** cho công ty tại `/erp/platform/cong-ty/[id]` (gói module).
2. Tenant DB: bảng `customs_*` trong `schema-tenant.sql` trên **DB tenant** (công ty mới provision tự có; DB cũ: `psql` hoặc `npm run db:migrate-tenant-b`).
3. `/erp/xnk/cau-hinh` — 4 thông số VNACCS, bật **Chế độ thử**, **Lưu** → **Test kết nối HQ** (mô phỏng nếu chưa có gateway).
4. `/erp/xnk/hai-quan-nhap` — chỉ mở wizard khi đã cấu hình → **Gửi IDA** → **Gửi IDC**.

**Nộp thật qua cổng web:** soạn trên ERP → nhập/import trên [cổng Khai báo Hải quan](https://e-declaration.customs.gov.vn:8443/#/eclare-ui/QLTKN/QLTKN_IDA) → IDA → IDC + ký số. File `ToKhaiHQ7N_*.xlsx` mẫu trong repo hiện là **phản hồi HQ sau IDA**, chưa phải template import — khi có file import thật, đặt `data/customs/templates/ToKhaiHQ7N-import-template.xlsx` và chỉnh `to-khai-hq7n-export.ts`.

**Test mô phỏng (gateway):** giữ *Chế độ thử* hoặc không set `CUSTOMS_VNACCS_GATEWAY_URL` — ERP sinh số IDA/IDC giả.

**Khai thật qua API gateway** cần thêm:

- Chữ ký số USB (PKCS#11) — thường qua phần mềm/agent của HQ hoặc gateway đối tác.
- `CUSTOMS_VNACCS_GATEWAY_URL` trỏ endpoint do đối tác chứng thực (ECUS EDI, nhà cung cấp tích hợp VNACCS) — HQ không mở REST công khai cho mọi DN.
- Tắt *Chế độ thử* trong cấu hình khi đã có gateway production.

#### Signing agent (không cố định CA)

Hệ thống hỗ trợ quét cert/token runtime (không hard-code CA). Mỗi công ty có thể chọn cert riêng để ký:

```env
CUSTOMS_SIGNING_AGENT_URL=http://127.0.0.1:8777
CUSTOMS_SIGNING_AGENT_TOKEN=change-me
```

Trang `/erp/xnk/cau-hinh` có nút **Quét cert đang gắn** và lưu cert theo công ty (`thumbprint/subject/issuer/provider`).

Chưa có gateway: hệ thống chạy **mô phỏng** (cấp số IDA/IDC giả để test quy trình).

### Kiểm tra "thông tin thật" trước khi gửi

Tab **Gửi HQ** có nút **Kiểm tra trước khi gửi** (preflight). Hệ thống kiểm tra:

- Bắt buộc trường theo tờ khai, định dạng mã HS, MST, ngày, tổng tiền.
- Danh mục mã nội bộ (loại hình, incoterms, phương thức vận chuyển/thanh toán).
- Đối soát ngoài hệ thống (nếu cấu hình API thật):

```env
CUSTOMS_INVOICE_VERIFY_URL=https://your-provider.example/verify/invoice
CUSTOMS_BOL_VERIFY_URL=https://your-provider.example/verify/bol
CUSTOMS_EXTERNAL_VERIFY_TOKEN=your-api-token
```

API đối soát phải trả JSON có `matched:boolean` hoặc `exists:boolean`.  
Nếu trả `matched=false`, preflight sẽ báo **lỗi** và chặn gửi IDA/IDC.

## Ghi chú kỹ thuật

- Các lệnh `npm run db:seed`, `db:seed-wood`, `db:create-erp` tự đọc file **`.env`** ở thư mục project (giống Next).
- Nếu `/erp` hoặc trang con báo **500** với `Cannot find module './xxxx.js'` trong `.next`, hoặc lỗi **`SegmentViewNode` / React Client Manifest** khi dev: dừng `npm run dev`, chạy `npm run clean && npm run dev` (cache webpack bị lệch sau HMR). Trong repo đã tắt `experimental.devtoolSegmentExplorer` để giảm lỗi devtools trên Windows.
- Nếu `/erp` báo 500 kiểu `_document` / `_app`: xóa cache build rồi chạy lại dev: `npm run clean && npm run dev`.
- SQLite (`data/hoaphong.db`) **không còn dùng** — migrate sang PostgreSQL.
- API REST vẫn ở `/api/*` (dùng chung cho website và ERP).

## Kiến trúc database (phương án B)

| Lớp | `DATABASE_URL` | Nội dung |
|-----|----------------|----------|
| **Platform** | `erp` (một DB) | `users`, `companies`, `company_members`, `company_modules`, blog/CMS |
| **Tenant** | `erp_t_<id>_<code>` mỗi công ty | Dự án, kho gỗ, khách hàng, sản xuất, kho vật tư… |

Sau khi cài Postgres:

```bash
npm run db:create-erp
npm run db:seed
npm run db:migrate-tenant-b   # tạo tenant DB + copy dữ liệu cũ nếu đang dùng 1 DB thống nhất
```

Công ty mới (Premium tạo) tự `CREATE DATABASE` tenant. Server riêng sau này: set `companies.tenant_db_url`.

## Phân quyền ERP

| Vai trò | Phạm vi |
|--------|---------|
| **Hoa Phong Premium** | `users.is_platform_admin = true` — **duy nhất** được thêm/sửa `company_members` và bật/tắt **module**; còn quyền Ultimate (mọi công ty, Platform Admin) |
| **Admin công ty** | Toàn quyền **trong** công ty (dự án, HR xem…) — **không** tự mời thành viên công ty hay đổi module |
| **Manager / Member** | Quyền hẹp hơn theo dự án / vai trò công ty |

Gán Premium (PostgreSQL):

```sql
UPDATE users SET is_platform_admin = TRUE WHERE email = 'email-cua-ban@example.com';
```

`npm run db:seed` gán Premium cho `ADMIN_EMAIL` trong `.env`.

## Test nhân sự & dự án (ERP)

1. Đăng nhập **Hoa Phong Premium** → tạo công ty / gán thành viên / bật module tại `/erp/platform/cong-ty/[id]`.
2. **Nhân sự** (Premium) → `/erp/hr/nhan-su` → tạo tài khoản + gán vào công ty.
3. Nhân viên đăng nhập `/erp/login`, chọn công ty.
4. **Quản lý dự án** → mở dự án → panel phải → tab **Nhân sự** → thêm thành viên dự án (vai trò owner/manager/member).

## Danh mục mã hải quan (XNK)

Trang **ERP → Xuất nhập khẩu → Danh mục mã hải quan** (`/erp/xnk/danh-muc`) tra cứu mã chi cục, cửa khẩu, phương thức vận chuyển, loại hình — dùng cho gợi ý trên tờ khai.

**Dữ liệu mặc định (nạp tự động):** cơ quan HQ xử lý (~225), cảng nhập VN (~123), kho/KCN/ICD (~41), cảng xuất quốc tế (~23 mã UN/LOCODE thường dùng), PTVT, loại hình. Tìm **live** theo mã, tên, mô tả. Tờ khai: cơ quan xử lý, cảng nhập, cảng xuất, kho — có gợi ý mã khi nhập.

```bash
npm run db:seed-customs          # nạp cho mọi công ty (nếu bảng trống)
npm run db:seed-customs -- --force   # cập nhật lại từ bundle
npm run db:build-customs-seed    # tái tạo JSON từ data/customs/ma-chi-cuc-source.md
```

**Cập nhật thủ công** (khi HQ ban hành bảng mã mới): customs.gov.vn → Bảng mã chuẩn → Tải về (`.htm` / `.xlsx`), hoặc mở mục «Cập nhật danh mục từ file HQ» trên ERP.

## Production

```bash
npm run build
npm start
```

Đặt `DATABASE_URL` và `JWT_SECRET` mạnh trên server.

### Deploy lên VPS bằng IP (chưa cần tên miền)

Chi tiết VPS: `deploy/DEPLOY-VPS.md`.

**VPS đã có web khác (2 site trên cổng 80):** Hoa Phong chạy **cổng 8080** — không đụng site cũ.

| Mục đích | URL (VPS đã có web) |
|----------|---------------------|
| Website | `http://IP:8080/` |
| Đăng nhập ERP | `http://IP:8080/erp/login` |
| Đăng ký doanh nghiệp | `http://IP:8080/erp/register` |
| Portal công ty | `http://IP:8080/erp/c/<ma-cty>` |
| Nhân viên đăng ký | `http://IP:8080/erp/dang-ky?tenant=<subdomain>` |

```bash
cd /var/www/hoaphong-site
sudo bash deploy/vps-setup.sh   # mặc định: nginx :8080 → app :3002
```

**VPS trống (chiếm cổng 80):** `COEXIST=0 sudo bash deploy/vps-setup.sh`

**Biến môi trường (VPS có web khác):**

```env
NEXT_PUBLIC_APP_URL=http://23.142.84.59:8080
ERP_HTTP=1
JWT_SECRET=...
DATABASE_URL=postgresql://...
```

Sau khi có tên miền: đổi `NEXT_PUBLIC_APP_URL` → `https://hoaphong.com.vn`, bỏ `ERP_HTTP`, trỏ DNS + SSL.


Email
admin@hoaphong.vn
Mật khẩu
DoiMatKhauAdmin123!
