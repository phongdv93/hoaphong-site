# Mẫu tờ khai HQ

## File hiện có (`templates/ToKhaiHQ7N-sample-MORETTO.xlsx`)

**Không phải file import.** Đây là **bản xác nhận / phản hồi HQ** sau khi đã gửi IDA (có số tờ khai, thuế, phân luồng…). Chỉ dùng tham khảo cấu trúc sheet TKN/HANG.

## File import thật (chưa có)

Khi có file mẫu **import** từ ECUS hoặc cổng e-declaration (tờ mới, chưa nộp), đặt tại:

`data/customs/templates/ToKhaiHQ7N-import-template.xlsx`

Rồi chỉnh `src/lib/customs/to-khai-hq7n-export.ts` cho khớp.

Tạm thời ERP vẫn có nút xuất ToKhaiHQ7N (thử nghiệm) — **không** dùng để import lên cổng cho đến khi có template đúng.

## XML IDA (tham khảo)

`golden-ida-sample.xml` — so khớp `ida-xml-export.ts` nếu cổng hỗ trợ import XML.

Tài liệu TCHQ: [VNACCS downloads](http://www.vnaccs.com/search/label/downloads).
