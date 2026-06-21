import Link from "next/link";
import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { Database, FileInput, Settings } from "lucide-react";

export default function XnkHubPage() {
  return (
    <ErpShell title="Xuất nhập khẩu" groupId="xnk">
      <ModuleAccessGuard moduleId="xnk">
        <div className="p-4 space-y-4 max-w-xl">
          <p className="text-sm text-slate-400">
            Khai HQ tối giản — 3 bước, dán hàng từ Excel, một nút gửi. Không giao diện kiểu ECUS.
          </p>
          <div className="grid gap-3">
            <Link
              href="/erp/xnk/hai-quan-nhap"
              className="erp-card-hover flex items-center gap-3 p-4"
            >
              <FileInput className="text-sky-light" size={22} />
              <div>
                <div className="font-medium text-white">Khai báo nhập khẩu</div>
                <div className="text-xs text-slate-400">Tờ khai IDA / IDC, hàng hóa, truyền HQ</div>
              </div>
            </Link>
            <Link
              href="/erp/xnk/cau-hinh"
              className="erp-card-hover flex items-center gap-3 p-4"
            >
              <Settings className="text-sky-light" size={22} />
              <div>
                <div className="font-medium text-white">Cấu hình VNACCS</div>
                <div className="text-xs text-slate-400">User Code, Terminal ID, gateway</div>
              </div>
            </Link>
            <Link
              href="/erp/xnk/danh-muc"
              className="erp-card-hover flex items-center gap-3 p-4"
            >
              <Database className="text-sky-light" size={22} />
              <div>
                <div className="font-medium text-white">Danh mục mã hải quan</div>
                <div className="text-xs text-slate-400">Import và tra cứu mã chi cục, kho bãi, cửa khẩu</div>
              </div>
            </Link>
          </div>
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}
