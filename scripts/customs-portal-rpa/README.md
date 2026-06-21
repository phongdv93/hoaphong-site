# Bot nộp IDA lên cổng Hải quan (Playwright)

Luồng **cảnh 2** trong kế hoạch ERP:

1. ERP xuất `IDA_*.xml` (tab Gửi HQ → Tải XML).
2. Bot này mở [cổng Khai báo Hải quan](https://e-declaration.customs.gov.vn:8443/#/eclare-ui/QLTKN/QLTKN_IDA), đăng nhập, upload XML (khi đã cấu hình selector).
3. Nhân viên ký số + gửi IDA / IDC trên cổng (bot mẫu chưa tự ký token).

## Cài đặt

```bash
cd scripts/customs-portal-rpa
npm install
npm run install-browser
```

## Chạy thử

```powershell
$env:CUSTOMS_PORTAL_USER="mst-hoac-user-hq"
$env:CUSTOMS_PORTAL_PASSWORD="***"
$env:CUSTOMS_IDA_XML_PATH="D:\Downloads\IDA_HQS4324-260508_2025.1-ecus-tabs.xml"
$env:CUSTOMS_RPA_HEADLESS="0"
npm run submit-ida
```

## Cấu hình selector

Mở cổng HQ → F12 → copy selector ô user/pass/nút Import → đặt biến:

- `CUSTOMS_RPA_SEL_USER`
- `CUSTOMS_RPA_SEL_PASSWORD`
- `CUSTOMS_RPA_SEL_LOGIN_BTN`
- `CUSTOMS_RPA_SEL_IMPORT_BTN`

Hoặc sửa trực tiếp `selectors.ts`.

## Lưu ý

- Cổng HQ có thể **không** có import XML cả tờ khai — khi đó dùng file Excel hàng (F6) từ ERP + nhập tab trên cổng.
- Không lưu mật khẩu trong git. Chạy bot trên máy có token USB khi cần ký.
- XML phải khớp mẫu vàng: export 1 tờ khai từ ECUS/cổng → lưu `data/customs/golden-ida-sample.xml` → chỉnh `src/lib/customs/ida-xml-export.ts`.
