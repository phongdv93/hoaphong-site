import { Suspense } from "react";
import { EmployeeRegisterPage } from "./EmployeeRegisterClient";

export default function DangKyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-midnight flex items-center justify-center text-slate-400">
          Đang tải…
        </div>
      }
    >
      <EmployeeRegisterPage />
    </Suspense>
  );
}
