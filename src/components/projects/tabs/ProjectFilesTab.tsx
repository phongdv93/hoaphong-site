"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Plus, Trash2, Upload } from "lucide-react";
import type { ProjectFileSection } from "@/lib/projects/types";
import type { WizardDraftFileSection } from "@/lib/projects/wizard-draft";
import { isImageMime, newTempId } from "@/lib/projects/wizard-draft";
import { ProjectFileLightbox, type LightboxImage } from "../ProjectFileLightbox";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type FileRow = {
  id: number | string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploaderName?: string;
};

type SectionRow = {
  id: number | string;
  title: string;
  files: FileRow[];
};

export function ProjectFilesTab({
  projectId,
  canEdit,
  draftSections,
  onDraftChange,
}: {
  projectId?: number;
  canEdit: boolean;
  draftSections?: WizardDraftFileSection[];
  onDraftChange?: (sections: WizardDraftFileSection[]) => void;
}) {
  const draftMode = Boolean(onDraftChange);
  const [sections, setSections] = useState<ProjectFileSection[] | null>(null);
  const [loading, setLoading] = useState(!draftMode);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const reload = useCallback(async () => {
    if (draftMode || !projectId) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/file-sections`);
    if (res.ok) setSections(await res.json());
    else setSections([]);
    setLoading(false);
  }, [projectId, draftMode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const displaySections: SectionRow[] = useMemo(() => {
    if (draftMode) {
      return (draftSections ?? []).map((s) => ({
        id: s.tempId,
        title: s.title,
        files: s.files.map((f) => ({
          id: f.tempId,
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
        })),
      }));
    }
    return (sections ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      files: s.files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        uploaderName: f.uploaderName,
      })),
    }));
  }, [draftMode, draftSections, sections]);

  const allImages: LightboxImage[] = useMemo(
    () =>
      displaySections.flatMap((s) =>
        s.files
          .filter((f) => isImageMime(f.mimeType, f.fileName) && f.fileUrl)
          .map((f) => ({ url: f.fileUrl, name: f.fileName }))
      ),
    [displaySections]
  );

  async function addSection() {
    const title = newTitle.trim();
    if (!title) return;
    if (draftMode && onDraftChange) {
      onDraftChange([
        ...(draftSections ?? []),
        { tempId: newTempId(), title, files: [] },
      ]);
      setNewTitle("");
      return;
    }
    if (!projectId) return;
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

  async function renameSection(sectionId: string | number, title: string) {
    const t = title.trim();
    if (!t) return;
    if (draftMode && onDraftChange) {
      onDraftChange(
        (draftSections ?? []).map((s) =>
          s.tempId === sectionId ? { ...s, title: t } : s
        )
      );
      return;
    }
    if (typeof sectionId !== "number" || sectionId <= 0 || !projectId) return;
    await fetch(`/api/projects/${projectId}/file-sections/${sectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    await reload();
  }

  async function removeSection(sectionId: string | number) {
    if (!confirm("Xóa nhóm tài liệu và tất cả file trong nhóm?")) return;
    if (draftMode && onDraftChange) {
      onDraftChange((draftSections ?? []).filter((s) => s.tempId !== sectionId));
      return;
    }
    if (typeof sectionId !== "number" || !projectId) return;
    await fetch(`/api/projects/${projectId}/file-sections/${sectionId}`, {
      method: "DELETE",
    });
    await reload();
  }

  async function uploadFiles(sectionId: string | number, fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploadingSection(sectionId);
    try {
      const uploaded: FileRow[] = [];
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/projects/upload", { method: "POST", body: fd });
        if (!up.ok) continue;
        const { url } = (await up.json()) as { url: string };
        const row: FileRow = {
          id: newTempId(),
          fileName: file.name,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        };
        if (draftMode && onDraftChange) {
          uploaded.push(row);
        } else if (typeof sectionId === "number" && projectId) {
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
      }
      if (draftMode && onDraftChange && uploaded.length) {
        onDraftChange(
          (draftSections ?? []).map((s) =>
            s.tempId === sectionId
              ? {
                  ...s,
                  files: [
                    ...s.files,
                    ...uploaded.map((u) => ({
                      tempId: String(u.id),
                      fileName: u.fileName,
                      fileUrl: u.fileUrl,
                      fileSize: u.fileSize,
                      mimeType: u.mimeType,
                    })),
                  ],
                }
              : s
          )
        );
      } else if (!draftMode) {
        await reload();
      }
    } finally {
      setUploadingSection(null);
    }
  }

  async function removeFile(sectionId: string | number, fileId: string | number) {
    if (!confirm("Xóa file này?")) return;
    if (draftMode && onDraftChange) {
      onDraftChange(
        (draftSections ?? []).map((s) =>
          s.tempId === sectionId
            ? { ...s, files: s.files.filter((f) => f.tempId !== fileId) }
            : s
        )
      );
      return;
    }
    if (typeof fileId !== "number" || !projectId) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    await reload();
  }

  function openLightbox(url: string) {
    const idx = allImages.findIndex((i) => i.url === url);
    if (idx >= 0) setLightboxIndex(idx);
  }

  if (loading) {
    return <p className="text-slate-400 py-4 text-center">Đang tải tài liệu…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500">
        Nhóm theo tiêu đề — mỗi tiêu đề có thể đính kèm một hoặc nhiều file. Ảnh xem trực tiếp,
        bấm để phóng to.
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

      {!displaySections.length ? (
        <p className="text-slate-400 text-center py-6 border border-dashed border-white/10 rounded-lg text-xs">
          Chưa có nhóm tài liệu — thêm tiêu đề rồi đính kèm file.
        </p>
      ) : (
        <ul className="space-y-3">
          {displaySections.map((sec) => {
            const imageFiles = sec.files.filter((f) =>
              isImageMime(f.mimeType, f.fileName)
            );
            return (
              <li
                key={sec.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/10 bg-white/[0.02]">
                  {canEdit ? (
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
                  {canEdit && (
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

                {imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2.5 border-b border-white/5">
                    {imageFiles.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => openLightbox(f.fileUrl)}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/15 hover:border-sky/50 focus:outline-none focus:ring-1 focus:ring-sky/50"
                        title={f.fileName}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.fileUrl}
                          alt={f.fileName}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {sec.files.length === 0 ? (
                  <p className="text-[10px] text-slate-500 px-3 py-2">Chưa có file trong nhóm này.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {sec.files.map((f) => {
                      const isImg = isImageMime(f.mimeType, f.fileName);
                      const isPdf = /\.pdf$/i.test(f.fileName) || f.mimeType === "application/pdf";
                      return (
                        <li key={f.id} className="px-2.5 py-2 space-y-1.5">
                          <div className="flex items-center gap-2">
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
                                title="Mở / tải"
                              >
                                {isImg ? (
                                  <ExternalLink size={13} />
                                ) : (
                                  <Download size={13} />
                                )}
                              </a>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => void removeFile(sec.id, f.id)}
                                className="p-1 text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          {isPdf && f.fileUrl && (
                            <iframe
                              src={f.fileUrl}
                              title={f.fileName}
                              className="w-full h-48 rounded border border-white/10 bg-white"
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {lightboxIndex !== null && allImages.length > 0 && (
        <ProjectFileLightbox
          images={allImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
