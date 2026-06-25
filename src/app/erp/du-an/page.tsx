import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { ProjectListClient } from "@/components/projects/ProjectListClient";

export default function DuAnPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  return (
    <ErpShell title="Quản lý dự án" groupId="du-an" fillHeight contentBleed>
      {!hasDb ? (
        <DbSetupBanner />
      ) : (
        <ModuleAccessGuard moduleId="du-an">
          <div className="flex flex-col flex-1 min-h-0 h-0 overflow-hidden">
            <ProjectListClient />
          </div>
        </ModuleAccessGuard>
      )}
    </ErpShell>
  );
}
