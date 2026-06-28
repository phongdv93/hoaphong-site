"use client";

import { ProjectFilesTab } from "./tabs/ProjectFilesTab";
import type { WizardDraftFileSection } from "@/lib/projects/wizard-draft";

export function WizardFilesStep({
  projectId,
  draftSections,
  onDraftChange,
}: {
  projectId?: number;
  draftSections?: WizardDraftFileSection[];
  onDraftChange?: (sections: WizardDraftFileSection[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Thêm nhóm tài liệu theo tiêu đề — có thể bỏ qua và bổ sung sau.
      </p>
      <ProjectFilesTab
        projectId={projectId}
        canEdit
        draftSections={draftSections}
        onDraftChange={onDraftChange}
      />
    </div>
  );
}
