"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Plus, Trash2, Upload } from "lucide-react";
import type { ProjectFileSection } from "@/lib/projects/types";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectFilesTab({
  projectId,
  canEdit,
}: {
  projectId: number;
  canEdit: boolean;
}) {
  const [sections, setSections] = useState<ProjectFileSection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/file-sections`);
    if (res.ok) setSections(await res.json());
    else setSections([]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addSection() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    const res = await fetch(`/api/projects/${projectId}/file-sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setAdding(false);
    if (res.ok) {
      setNewTitle("");
      await reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(typeof j.error === "string" ? j.error : "Không thêm được nhóm");
    }
  }

  async function renameSection(sectionId: number, title: string) {
    const t = title.trim();
    if (!t || sectionId <= 0) return;
    await fetch(`/api/projects/${projectId}/file-sections/${sectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    await reload();
  }

  async function removeSection(sectionId: number) {
    if (sectionId <= 0) return;
    if (!confirm("Xóa nhóm tài liệu và tất cả file trong nhóm?")) return;
    await fetch(`/api/projects/${projectId}/file-sections/${sectionId}`, {
      method: "DELETE",
    });
    await reload();
  }

  async function uploadFiles(sectionId: number, fileList: FileList | null) {
    if (!fileList?.length || sectionId <= 0) return;
    setUploadingSection(sectionId);
    try {
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/projects/upload", { method: "POST", body: fd });
        if (!up.ok) continue;
        const { url } = (await up.json()) as { url: string };
        await fetch(`/api/projects/${projectId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId,
            fileName: file.name,
            fileUrl: url,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
          }),
        });
      }
      await reload();
    } finally {
      setUploadingSection(null);
    }
  }

  async function removeFile(fileId: number) {
    if (!confirm("Xóa file này?")) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    await reload();
  }

  if (loading) {
    return <p className="text-slate-400 py-4 text-center">Đang tải tài liệu…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500">
        Nhóm theo tiêu đề — mỗi tiêu đề có thể đính kèm một hoặc nhiều file.
      </p>

      {canEdit && (
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addSection()}
            placeholder="Tiêu đề nhóm tài liệu mới…"
            className="input-field text-xs flex-1 min-w-0 h-[30px]"
          />
          <button
            type="button"
            disabled={adding || !newTitle.trim()}
            onClick={() => void addSection()}
            className="shrink-0 inline-flex items-center gap-1 px-3 h-[30px] rounded-lg bg-sky text-white text-xs hover:bg-sky-light disabled:opacity-50"
          >
            <Plus size={14} /> Thêm
          </button>
        </div>
      )}

      {!sections?.length ? (
        <p className="text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-lg text-xs">
          Chưa có nhóm tài liệu — thêm tiêu đề rồi đính kèm file.
        </p>
      ) : (
        <ul className="space-y-3">
          {sections.map((sec) => (
            <li
              key={sec.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/10 bg-white/[0.02]">
                {canEdit && sec.id > 0 ? (
                  <input
                    defaultValue={sec.title}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== sec.title) void renameSection(sec.id, v);
                    }}
                    className="input-field text-xs font-medium flex-1 min-w-0 h-[28px] py-0"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-200 flex-1 truncate">
                    {sec.title}
                  </span>
                )}
                {canEdit && sec.id > 0 && (
                  <>
                    <label
                      className={`shrink-0 inline-flex items-center gap-1 px-2 h-[28px] rounded-md border border-white/15 text-[10px] text-slate-300 hover:bg-white/10 cursor-pointer ${
                        uploadingSection === sec.id ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Upload size={12} />
                      {uploadingSection === sec.id ? "Đang tải…" : "Thêm file"}
                      <input
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={(e) => void uploadFiles(sec.id, e.target.files)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void removeSection(sec.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                      title="Xóa nhóm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
              {sec.files.length === 0 ? (
                <p className="text-[10px] text-slate-500 px-3 py-2">Chưa có file trong nhóm này.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {sec.files.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 px-2.5 py-1.5">
                      <FileText size={14} className="text-sky shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-white truncate">{f.fileName}</div>
                        <div className="text-[9px] text-slate-500">
                          {formatBytes(f.fileSize)}
                          {f.uploaderName ? ` · ${f.uploaderName}` : ""}
                        </div>
                      </div>
                      {f.fileUrl && (
                        <a
                          href={f.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-sky hover:bg-white/10 rounded"
                          title="Tải xuống"
                        >
                          <Download size={13} />
                        </a>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => void removeFile(f.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
