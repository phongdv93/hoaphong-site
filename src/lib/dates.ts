/** Chuỗi YYYY-MM-DD theo lịch local — tránh lệch ngày do UTC (node-pg DATE). */
export function toLocalDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

/** ISO → hiển thị dd/mm/yyyy */
export function isoToVnDate(iso: string | null | undefined): string {
  const s = iso ? toLocalDateString(iso) : null;
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

/** dd/mm/yyyy → ISO YYYY-MM-DD (null nếu không hợp lệ) */
export function vnDateToIso(vn: string): string | null {
  const t = vn.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dt = new Date(`${iso}T12:00:00`);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() + 1 !== month ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return iso;
}

/** Định dạng ngày tiếng Việt cho hiển thị */
export function formatDateVi(iso: string | null | undefined): string {
  const v = isoToVnDate(iso);
  return v || "—";
}

/** Số ngày lịch (bao gồm cả ngày bắt đầu và kết thúc). */
export function inclusiveDayCount(startIso: string, endIso: string): number {
  if (!startIso || !endIso || endIso < startIso) return 0;
  const s = new Date(`${startIso.slice(0, 10)}T12:00:00`);
  const e = new Date(`${endIso.slice(0, 10)}T12:00:00`);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

/** Cộng (n - 1) ngày lịch — duration=1 → cùng ngày bắt đầu. */
export function endDateFromDuration(startIso: string, durationDays: number): string {
  const n = Math.max(1, Math.floor(durationDays));
  const d = new Date(`${startIso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + n - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftIsoDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type ScheduleEditField = "start" | "end" | "days";

/** Đồng bộ bắt đầu / kết thúc / số ngày và kẹp trong hạn dự án. */
export function resolvePhaseSchedule(input: {
  startedAt: string;
  deadlineAt: string;
  dayCount: number;
  edited: ScheduleEditField;
  projectStart?: string | null;
  projectEnd?: string | null;
}): {
  startedAt: string;
  deadlineAt: string;
  dayCount: number;
  clamped: boolean;
} {
  let start = input.startedAt.slice(0, 10);
  let end = input.deadlineAt.slice(0, 10);
  let days = Math.max(0, Math.floor(input.dayCount));
  let clamped = false;

  if (input.edited === "days" && start && days > 0) {
    end = endDateFromDuration(start, days);
  } else if (input.edited === "start" && start) {
    if (days > 0) end = endDateFromDuration(start, days);
    else if (end) days = inclusiveDayCount(start, end);
  } else if (input.edited === "end" && start && end) {
    days = inclusiveDayCount(start, end);
  } else if (start && end) {
    days = inclusiveDayCount(start, end);
  }

  if (input.projectStart && start && start < input.projectStart) {
    start = input.projectStart;
    clamped = true;
    if (days > 0) end = endDateFromDuration(start, days);
  }
  if (input.projectEnd && start && start > input.projectEnd) {
    start = input.projectEnd;
    clamped = true;
    if (days > 0) end = endDateFromDuration(start, days);
  }

  if (input.projectEnd && end && end > input.projectEnd) {
    end = input.projectEnd;
    clamped = true;
    if (start) days = inclusiveDayCount(start, end);
  }

  if (start && end && end < start) {
    end = start;
    days = 1;
    clamped = true;
  }

  if (start && end && days <= 0) {
    days = inclusiveDayCount(start, end);
  }

  return { startedAt: start, deadlineAt: end, dayCount: days, clamped };
}
