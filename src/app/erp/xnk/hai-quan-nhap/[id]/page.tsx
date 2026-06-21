import { ErpShell } from "@/components/erp/ErpShell";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { ImportDeclarationWizard } from "@/components/customs/ImportDeclarationWizard";

export default async function HaiQuanNhapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  return (
    <ErpShell title="Tờ khai nhập" groupId="xnk">
      <ModuleAccessGuard moduleId="xnk">
        <div className="p-4 max-w-3xl">
          {Number.isFinite(id) ? (
            <ImportDeclarationWizard id={id} />
          ) : (
            <p className="text-rose-300">ID không hợp lệ</p>
          )}
        </div>
      </ModuleAccessGuard>
    </ErpShell>
  );
}
