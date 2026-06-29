import { ErpShell } from "@/components/erp/ErpShell";
import { DbSetupBanner } from "@/components/erp/DbSetupBanner";
import { ModuleAccessGuard } from "@/components/erp/ModuleAccessGuard";
import { MailboxClient } from "@/components/mail/MailboxClient";

export default function HopThuPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  return (
    <ErpShell title="Hộp thư" groupId="marketing" fillHeight contentBleed>
      {!hasDb ? (
        <DbSetupBanner />
      ) : (
        <ModuleAccessGuard moduleId="marketing">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-3 py-3">
            <MailboxClient />
          </div>
        </ModuleAccessGuard>
      )}
    </ErpShell>
  );
}
