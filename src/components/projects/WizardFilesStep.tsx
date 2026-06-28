"use client";

import { ProjectFilesTab } from "./tabs/ProjectFilesTab";

export function WizardFilesStep({
  projectId,
}: {
  projectId: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Thêm nhóm tài liệu theo tiêu đề — có thể bỏ qua và bổ sung sau.
      </p>
      <ProjectFilesTab projectId={projectId} canEdit />
    </div>
  );
}
