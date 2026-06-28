import type { PhaseKind, ProjectMemberRole } from "./types";

export type WizardDraftItem = {
  tempId: string;
  name: string;
  quantity: number;
  unit?: string;
  description?: string;
  factoryProductId?: number;
};

export type WizardDraftPhase = {
  tempId: string;
  kind: PhaseKind;
  name: string;
  sortOrder: number;
  progressFromItems?: boolean;
};

export type WizardDraftFile = {
  tempId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
};

export type WizardDraftFileSection = {
  tempId: string;
  title: string;
  files: WizardDraftFile[];
};

export type WizardDraftMember = {
  userId: number;
  userName: string;
  role: ProjectMemberRole;
};

export function newTempId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isImageMime(mime: string, fileName: string): boolean {
  if (mime.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|bmp|svg)$/i.test(fileName);
}
