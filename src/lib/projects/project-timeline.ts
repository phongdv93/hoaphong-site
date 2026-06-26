import {
  endDateFromDuration,
  inclusiveDayCount,
  toLocalDateString,
} from "@/lib/dates";
import type { ProjectSummary } from "./types";

export const DEFAULT_PROJECT_DURATION_DAYS = 7;
/** Tối thiểu số ngày hiển thị trên Gantt để còn bấm Chi tiết. */
export const GANTT_MIN_BAR_DAYS = 7;

type TimelinePick = Pick<
  ProjectSummary,
  "startDate" | "expectedEndDate" | "actualEndDate" | "createdAt"
>;

/** Ngày bắt đầu / kết thúc cho thanh Gantt — mặc định 7 ngày từ ngày tạo nếu thiếu. */
export function resolveProjectTimelineDates(
  project: TimelinePick,
  today: string
): { start: string; end: string } {
  const created = toLocalDateString(project.createdAt) ?? today;
  const hasStart = Boolean(project.startDate?.trim());
  const hasEnd = Boolean(
    project.expectedEndDate?.trim() || project.actualEndDate?.trim()
  );

  let start = project.startDate?.trim() || created;
  let end =
    project.actualEndDate?.trim() ||
    project.expectedEndDate?.trim() ||
    "";

  if (!hasStart && !hasEnd) {
    start = created;
    end = endDateFromDuration(start, DEFAULT_PROJECT_DURATION_DAYS);
  } else if (!hasEnd) {
    end = endDateFromDuration(start, DEFAULT_PROJECT_DURATION_DAYS);
  } else if (!hasStart) {
    start = created;
  }

  if (!end || end < start) {
    end = endDateFromDuration(start, DEFAULT_PROJECT_DURATION_DAYS);
  }

  const span = inclusiveDayCount(start, end);
  if (span < GANTT_MIN_BAR_DAYS) {
    end = endDateFromDuration(start, GANTT_MIN_BAR_DAYS);
  }

  return { start, end };
}

/** Mặc định khi tạo dự án không nhập ngày. */
export function defaultProjectScheduleDates(createdAt?: string | null): {
  startDate: string;
  expectedEndDate: string;
} {
  const start =
    toLocalDateString(createdAt ?? new Date()) ??
    new Date().toISOString().slice(0, 10);
  return {
    startDate: start,
    expectedEndDate: endDateFromDuration(start, DEFAULT_PROJECT_DURATION_DAYS),
  };
}
