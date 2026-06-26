"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
} from "lucide-react";
import type { ProjectGanttPhase, ProjectSummary } from "@/lib/projects/types";
import {
  analyzeProjectSchedule,
  scheduleHealthColors,
  type ScheduleAnalysis,
} from "@/lib/projects/schedule-health";
import { getPhaseTimeRanges, type PhaseTimeRange } from "@/lib/projects/phase-timeline";
import { formatDateVi, toLocalDateString } from "@/lib/dates";

export const DEFAULT_DAY_WIDTH = 28;
export const MIN_GANTT_DAY_WIDTH = 8;
export const MAX_GANTT_DAY_WIDTH = 40;
/** Dưới ngưỡng này — header gom theo tuần thay vì từng ngày */
const COMPACT_HEADER_CELL_W = 18;
const ROW_H = 64;
const EXPAND_LINE_H = 22;
const EXPANDED_PHASE_ROWS = 7;
/** Thêm ngày trống bên trái timeline để nhãn công đoạn không bị clip */
const GANTT_LEFT_PAD_DAYS = 18;
const PHASE_BAR_H = 14;

function rangeToTimelinePx(
  rangeStart: string,
  rangeEnd: string,
  indexOfDate: (iso: string) => number,
  cellW: number
): { left: number; width: number } | null {
  const sIdx = indexOfDate(rangeStart);
  const eIdx = indexOfDate(rangeEnd);
  if (sIdx < 0 || eIdx < 0) return null;
  const lo = Math.min(sIdx, eIdx);
  const hi = Math.max(sIdx, eIdx);
  return { left: lo * cellW, width: (hi - lo + 1) * cellW };
}
const HEADER_H = 56;
const ROW_GAP = 4;

/** Gantt ngang — màu theo tiến độ; click card mở công đoạn; nút Chi tiết mở panel. */
export function ProjectsGantt({
  projects,
  expandedId,
  panelProjectId,
  onToggleExpand,
  onOpenPanel,
  dayWidth = DEFAULT_DAY_WIDTH,
  className = "",
}: {
  projects: ProjectSummary[];
  expandedId: number | null;
  panelProjectId: number | null;
  onToggleExpand: (id: number) => void;
  onOpenPanel: (id: number) => void;
  dayWidth?: number;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const dw = Math.max(MIN_GANTT_DAY_WIDTH, Math.min(MAX_GANTT_DAY_WIDTH, dayWidth));

  const range = useMemo(() => computeRange(projects), [projects]);
  const baseDays = useMemo(() => enumerateDays(range.from, range.to), [range]);
  const days = useMemo(
    () => padDaysToFillViewport(baseDays, viewportW, dw),
    [baseDays, viewportW, dw]
  );
  const cellW = dw;
  const layoutW = days.length * cellW;
  const today = todayIso();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [projects.length, dayWidth]);

  const rowLayout = useMemo(() => {
    let y = ROW_GAP;
    return projects.map((p) => {
      const expanded = expandedId === p.id;
      const extra = expanded
        ? Math.min(p.phases?.length ?? 0, EXPANDED_PHASE_ROWS) * EXPAND_LINE_H + 6
        : 0;
      const rowTotal = ROW_H + extra;
      const layout = { top: y, barH: rowTotal - ROW_GAP, expanded };
      y += rowTotal + ROW_GAP;
      return layout;
    });
  }, [projects, expandedId]);

  const canvasH = rowLayout.length
    ? rowLayout[rowLayout.length - 1].top +
      rowLayout[rowLayout.length - 1].barH +
      ROW_GAP
    : 0;

  const dayIndex = useMemo(() => {
    const m = new Map<string, number>();
    days.forEach((d, i) => m.set(d, i));
    return m;
  }, [days]);

  function indexOfDate(iso: string): number {
    return dayIndex.get(iso) ?? -1;
  }

  function scrollToToday() {
    const idx = indexOfDate(today);
    if (idx >= 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, idx * cellW - 200);
    }
  }

  useEffect(() => {
    scrollToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function scrollBy(delta: number) {
    if (scrollRef.current) scrollRef.current.scrollLeft += delta;
  }

  function scrollToProjectBar(projectId: number) {
    const p = projects.find((x) => x.id === projectId);
    if (!p || !scrollRef.current) return;
    const startIso = projectStartDay(p, today);
    const idx = indexOfDate(startIso);
    if (idx >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, idx * cellW - 12);
    }
  }

  function handleOpenPanel(projectId: number) {
    scrollToProjectBar(projectId);
    onOpenPanel(projectId);
  }

  if (projects.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm ${className}`}
        style={{ background: "#0a1120", color: "#8b9cb5" }}
      >
        Chưa có dự án nào trong công ty.
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col flex-1 min-h-0 w-full overflow-hidden ${className}`}
      style={{ background: "#081229", color: "#e2e8f0" }}
    >
      <ScheduleLegend />
      <FloatingControls
        onPrev={() => scrollBy(-cellW * 7)}
        onToday={scrollToToday}
        onNext={() => scrollBy(cellW * 7)}
      />

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 h-0 overflow-auto overscroll-x-contain w-full"
        title="Lăn chuột để cuộn ngang timeline"
      >
        <div
          className="relative min-h-full"
          style={{
            width: layoutW,
            minHeight: "100%",
            height: Math.max(HEADER_H + canvasH, 0),
          }}
        >
          <GridBackground
            days={days}
            todayIso={today}
            headerHeight={HEADER_H}
            cellW={cellW}
            layoutWidth={layoutW}
          />

          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              height: HEADER_H,
              width: layoutW,
              background: "rgba(8,18,41,0.96)",
              backdropFilter: "blur(4px)",
              borderBottom: "1px solid rgba(139,156,181,0.18)",
            }}
          >
            <DateHeader
              days={days}
              todayIso={today}
              cellW={cellW}
              layoutWidth={layoutW}
            />
          </div>

          <div
            style={{
              position: "relative",
              width: layoutW,
              height: canvasH,
            }}
          >
            {projects.map((p, i) => {
              const startIso = projectStartDay(p, today);
              const endIso =
                p.actualEndDate ||
                p.expectedEndDate ||
                startIso;
              let sIdx = indexOfDate(startIso);
              let eIdx = indexOfDate(endIso);
              if (sIdx < 0) sIdx = indexOfDate(today);
              if (eIdx < 0) eIdx = sIdx >= 0 ? sIdx : 0;
              if (sIdx < 0) return null;
              if (eIdx < sIdx) eIdx = sIdx;
              const x = sIdx * cellW;
              const w = Math.max(cellW, (eIdx - sIdx + 1) * cellW);
              const { top, barH, expanded } = rowLayout[i];
              const panelOpen = panelProjectId === p.id;
              const cardMainH = ROW_H - ROW_GAP;
              const phaseRanges = getPhaseTimeRanges(p.phases ?? [], startIso, endIso);
              return (
                <div
                  key={p.id}
                  className="absolute left-0 transition-[height] duration-300 ease-out"
                  style={{ top, width: layoutW, height: barH }}
                >
                  <ProjectBar
                    project={p}
                    x={x}
                    w={w}
                    cardMainH={cardMainH}
                    panelOpen={panelOpen}
                    expanded={expanded}
                    today={today}
                    onToggleExpand={() => onToggleExpand(p.id)}
                    onOpenPanel={() => handleOpenPanel(p.id)}
                  />
                  {phaseRanges.length > 0 && (
                    <ExpandedPhaseTimeline
                      expanded={expanded}
                      phaseRanges={phaseRanges.slice(0, EXPANDED_PHASE_ROWS)}
                      projectX={x}
                      projectW={w}
                      y={cardMainH}
                      cellW={cellW}
                      indexOfDate={indexOfDate}
                      today={today}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function mondayWeekKey(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}

function buildWeekBlocks(
  days: string[]
): { len: number; label: string; title: string; startDay: number }[] {
  const blocks: { len: number; label: string; title: string; startDay: number }[] = [];
  let i = 0;
  while (i < days.length) {
    const key = mondayWeekKey(days[i]);
    let j = i + 1;
    while (j < days.length && mondayWeekKey(days[j]) === key) j++;
    const start = new Date(`${days[i]}T12:00:00`);
    const end = new Date(`${days[j - 1]}T12:00:00`);
    const sameMonth = start.getMonth() === end.getMonth();
    const label = sameMonth
      ? `${start.getDate()}–${end.getDate()}/${start.getMonth() + 1}`
      : `${start.getDate()}/${start.getMonth() + 1}–${end.getDate()}/${end.getMonth() + 1}`;
    blocks.push({
      len: j - i,
      label,
      title: `${fmtVN(days[i])} → ${fmtVN(days[j - 1])}`,
      startDay: start.getDate(),
    });
    i = j;
  }
  return blocks;
}

function DateHeader({
  days,
  todayIso,
  cellW,
  layoutWidth,
}: {
  days: string[];
  todayIso: string;
  cellW: number;
  layoutWidth: number;
}) {
  const weekMode = cellW < COMPACT_HEADER_CELL_W;

  const monthBlocks: { len: number; label: string }[] = [];
  for (let i = 0; i < days.length; i++) {
    const d = new Date(`${days[i]}T00:00:00`);
    const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    const last = monthBlocks[monthBlocks.length - 1];
    if (last && last.label === label) last.len += 1;
    else monthBlocks.push({ len: 1, label });
  }

  const weekBlocks = weekMode ? buildWeekBlocks(days) : [];

  return (
    <div style={{ width: layoutWidth, height: HEADER_H }}>
      <div className="flex" style={{ height: 22 }}>
        {monthBlocks.map((b, i) => (
          <div
            key={i}
            style={{
              width: b.len * cellW,
              borderRight: "1px solid rgba(139,156,181,0.18)",
              background: "rgba(20,30,50,0.6)",
            }}
            className="text-[11px] font-semibold text-slate-200 px-2 flex items-center truncate"
          >
            {b.label}
          </div>
        ))}
      </div>
      <div className="flex" style={{ height: HEADER_H - 22 }}>
        {weekMode
          ? weekBlocks.map((b, i) => (
              <div
                key={i}
                style={{
                  width: b.len * cellW,
                  flexShrink: 0,
                  borderRight: "1px solid rgba(139,156,181,0.2)",
                  background: "rgba(20,30,50,0.35)",
                }}
                className="text-center flex items-center justify-center px-0.5 overflow-hidden"
                title={b.title}
              >
                <span className="tabular-nums text-[9px] leading-tight text-slate-300 truncate w-full">
                  {cellW < 12 ? String(b.startDay) : b.label}
                </span>
              </div>
            ))
          : days.map((d) => {
              const dt = new Date(`${d}T00:00:00`);
              const isToday = d === todayIso;
              const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
              const isMonthStart = dt.getDate() === 1;
              return (
                <div
                  key={d}
                  style={{
                    width: cellW,
                    flexShrink: 0,
                    borderRight: isMonthStart
                      ? "1px solid rgba(139,156,181,0.35)"
                      : "1px solid rgba(139,156,181,0.08)",
                    background: isToday
                      ? "rgba(239,68,68,0.18)"
                      : isWeekend
                      ? "rgba(139,156,181,0.06)"
                      : "transparent",
                    color: isToday ? "#fca5a5" : isWeekend ? "#94a3b8" : "#cbd5e1",
                  }}
                  className="text-center flex flex-col justify-center"
                  title={fmtVN(d)}
                >
                  <div
                    className="tabular-nums text-[11px] leading-none"
                    style={{ fontWeight: isToday || isMonthStart ? 700 : 500 }}
                  >
                    {dt.getDate()}
                  </div>
                  <div className="text-[9px] uppercase opacity-70 leading-none mt-0.5">
                    {["CN", "T2", "T3", "T4", "T5", "T6", "T7"][dt.getDay()]}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function GridBackground({
  days,
  todayIso,
  headerHeight,
  cellW,
  layoutWidth,
}: {
  days: string[];
  todayIso: string;
  headerHeight: number;
  cellW: number;
  layoutWidth: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: headerHeight,
        left: 0,
        bottom: 0,
        width: layoutWidth,
        minHeight: `calc(100% - ${headerHeight}px)`,
        pointerEvents: "none",
        zIndex: 0,
        display: "flex",
      }}
    >
      {days.map((d) => {
        const dt = new Date(`${d}T00:00:00`);
        const isMonthStart = dt.getDate() === 1;
        const isWeekStart = dt.getDay() === 1;
        const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
        const isToday = d === todayIso;
        return (
          <div
            key={d}
            style={{
              width: cellW,
              height: "100%",
              flexShrink: 0,
              borderRight: isMonthStart
                ? "1px solid rgba(139,156,181,0.25)"
                : isWeekStart
                ? "1px solid rgba(139,156,181,0.1)"
                : "1px solid rgba(139,156,181,0.12)",
              background: isToday
                ? "rgba(239,68,68,0.06)"
                : isWeekend
                ? "rgba(139,156,181,0.06)"
                : "transparent",
              position: "relative",
            }}
          >
            {isToday && (
              <div
                style={{
                  position: "absolute",
                  left: cellW / 2 - 1,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "#ef4444",
                  opacity: 0.7,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleLegend() {
  const items = [
    { color: "#22c55e", label: "Đúng tiến độ / hoàn thành" },
    { color: "#f59e0b", label: "Còn 1–2 ngày tới deadline" },
    { color: "#ef4444", label: "Quá deadline chưa xong" },
    { color: "rgba(255,255,255,0.35)", label: "Màu card = % hoàn thành (xanh / cam đỏ khi trễ)" },
    { color: "rgba(148,163,184,0.5)", label: "Lăn chuột = cuộn ngang · Nhãn trái dính khi kéo timeline" },
  ];
  return (
    <div
      className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-x-3 gap-y-1 max-w-[min(90%,520px)] px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300"
      style={{
        background: "rgba(8,18,41,0.92)",
        border: "1px solid rgba(139,156,181,0.2)",
      }}
    >
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-sm inline-block shrink-0"
            style={{ background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function estimatePhaseLabelWidth(phaseRanges: PhaseTimeRange[]): number {
  if (!phaseRanges.length) return 56;
  const max = Math.max(
    ...phaseRanges.map(({ phase }) => Math.min(phase.name.length * 6.4 + 16, 132))
  );
  return Math.min(148, Math.max(52, max));
}

function ExpandedPhaseTimeline({
  expanded,
  phaseRanges,
  projectX,
  projectW,
  y,
  cellW,
  indexOfDate,
  today,
}: {
  expanded: boolean;
  phaseRanges: PhaseTimeRange[];
  projectX: number;
  projectW: number;
  y: number;
  cellW: number;
  indexOfDate: (iso: string) => number;
  today: string;
}) {
  const h = phaseRanges.length * EXPAND_LINE_H + 4;
  const labelW = estimatePhaseLabelWidth(phaseRanges);
  return (
    <div
      className="absolute pointer-events-none z-[3] overflow-hidden transition-all duration-300 ease-out"
      style={{
        left: projectX - labelW,
        top: y,
        width: labelW + projectW,
        maxHeight: expanded ? h : 0,
        opacity: expanded ? 1 : 0,
      }}
    >
      {phaseRanges.map(({ phase, rangeStart, rangeEnd }) => {
        const pos = rangeToTimelinePx(rangeStart, rangeEnd, indexOfDate, cellW);
        if (!pos) return null;
        const barLeft = labelW + (pos.left - projectX);
        const fillPct = phaseFillPercent(phase);
        const borderColor = phaseScheduleColor(phase, today, rangeEnd);
        const fillColor = isPhaseOverdue(phase, today, rangeEnd) ? "#ef4444" : borderColor;

        return (
          <div
            key={phase.id}
            className="relative border-b border-white/5 last:border-0"
            style={{ height: EXPAND_LINE_H }}
            title={phaseSegmentTooltip(phase, rangeStart, rangeEnd, fillPct, today)}
          >
            <div
              className="sticky left-0 z-[2] inline-flex items-center w-max max-w-[9.5rem] pr-2"
              style={{
                top: 1,
                height: EXPAND_LINE_H - 2,
              }}
            >
              <span className="text-[10px] text-slate-300/95 leading-tight truncate">
                {phase.name}
              </span>
            </div>
            <div
              className="absolute rounded overflow-hidden box-border"
              style={{
                left: barLeft,
                width: pos.width,
                top: (EXPAND_LINE_H - PHASE_BAR_H) / 2,
                height: PHASE_BAR_H,
                border: `1px solid ${withAlpha(borderColor, 0.9)}`,
                background: "rgba(0,0,0,0.45)",
              }}
            >
              <div
                style={{
                  width: `${fillPct}%`,
                  height: "100%",
                  background: withAlpha(fillColor, 0.82),
                  transition: "width 0.2s ease",
                }}
              />
              <span
                className="absolute right-1 top-0 text-[10px] font-medium tabular-nums text-white/95 leading-[12px]"
                style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
              >
                {fillPct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectBar({
  project,
  x,
  w,
  cardMainH,
  panelOpen,
  expanded,
  today,
  onToggleExpand,
  onOpenPanel,
}: {
  project: ProjectSummary;
  x: number;
  w: number;
  cardMainH: number;
  panelOpen: boolean;
  expanded: boolean;
  today: string;
  onToggleExpand: () => void;
  onOpenPanel: () => void;
}) {
  const schedule = analyzeProjectSchedule(project, today);
  const hc = scheduleHealthColors(schedule.health);
  const accentColor = hc.stripe;
  const progress = computeCardProgress(project, schedule.progressPercent);
  const fillTone = cardProgressFillTone(schedule);

  const tooltipLines = [
    `${project.code} · ${project.name}`,
    `Hoàn thành: ${progress}% (${project.phaseDoneCount}/${project.phaseCount} công đoạn)`,
    schedule.expectedProgressPercent !== null
      ? `Kỳ vọng theo thời gian: ${schedule.expectedProgressPercent}%`
      : null,
    `Trạng thái: ${schedule.label}`,
    schedule.delayedPhaseNames.length > 0
      ? `Công đoạn trễ: ${schedule.delayedPhaseNames.join(", ")}`
      : null,
  ].filter(Boolean);

  const labels = cardLabelVisibility(w);
  const labelH = cardMainH;
  const pillR = cardMainH / 2;
  const cardBorder = panelOpen
    ? withAlpha(accentColor, 0.55)
    : schedule.alertLevel === "danger"
    ? withAlpha(hc.border, 0.45)
    : schedule.alertLevel === "warn"
    ? "rgba(245,158,11,0.35)"
    : "rgba(255,255,255,0.1)";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 0,
        width: w,
        height: cardMainH,
        zIndex: panelOpen ? 5 : schedule.alertLevel !== "none" ? 4 : 2,
      }}
      className="group"
      title={tooltipLines.join("\n")}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label="Mở/đóng công đoạn trên timeline"
        style={{
          width: w,
          height: cardMainH,
          borderRadius: pillR,
          background: panelOpen ? fillTone.baseActive : fillTone.base,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#e2e8f0",
          border: `1px solid ${cardBorder}`,
          boxShadow: panelOpen
            ? `0 6px 22px rgba(0,0,0,0.4), 0 0 0 1px ${withAlpha(accentColor, 0.2)}`
            : "0 2px 14px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
        className="absolute inset-0 text-left z-0 transition-all duration-200 group-hover:brightness-[1.08] group-hover:border-white/25 group-hover:shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
      >
        <div
          className="absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: fillTone.fill,
            borderRadius: pillR,
            transition: "width 0.35s ease",
          }}
          aria-hidden
        />
      </button>

      {/* Sticky ngang — bám mép trái khi cuộn, clip theo viền card */}
      <div
        className="sticky left-0 z-[6] inline-flex items-center gap-1 w-max max-w-full pointer-events-auto overflow-hidden"
        style={{
          height: labelH,
          maxHeight: labelH,
          maxWidth: w,
          paddingLeft: labels.padX + 6,
          paddingRight: 8,
          borderRadius: `${pillR}px 0 0 ${pillR}px`,
        }}
      >
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{
            background: accentColor,
            boxShadow: `0 0 8px ${withAlpha(accentColor, 0.65)}`,
          }}
          aria-hidden
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="shrink-0 p-0.5 rounded-full hover:bg-white/10 text-slate-300"
          title={expanded ? "Thu gọn công đoạn" : "Xem công đoạn trên timeline"}
          aria-expanded={expanded}
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
          />
        </button>
        <div className="flex flex-col justify-center min-w-0 max-w-[min(220px,calc(100vw-10rem))] gap-0 overflow-hidden leading-tight">
          <div className="flex items-center gap-1.5 min-w-0">
            {schedule.alertLevel !== "none" && (
              <span
                className="shrink-0 text-[8px] font-bold uppercase tracking-wide leading-none px-1 py-0.5 rounded-full"
                style={{ background: hc.badgeBg, color: hc.badgeText }}
              >
                {schedule.health === "overdue" ? "Trễ" : "!"}
              </span>
            )}
            <span className="truncate text-[13px] font-medium text-slate-100">
              {project.name}
            </span>
            {labels.showProgress && w >= 200 && (
              <span
                className="shrink-0 text-[11px] tabular-nums font-medium opacity-80"
                style={{ color: accentColor }}
              >
                {progress}%
              </span>
            )}
          </div>
          {labels.showMeta && labels.showCode && (
            <span className="font-mono text-[10px] text-slate-500 uppercase truncate">
              {project.code}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPanel();
          }}
          className="shrink-0 text-[11px] px-2.5 py-0.5 rounded-full border border-white/15 text-sky-light/95 hover:bg-white/10 hover:border-sky/40 font-medium transition-colors"
          title="Mở panel chi tiết dự án"
        >
          Chi tiết
        </button>
      </div>
    </div>
  );
}

/** Nền card + lớp fill tiến độ — xanh khi đúng hạn, cam/đỏ khi trễ */
function cardProgressFillTone(schedule: ScheduleAnalysis) {
  const late =
    schedule.health === "overdue" ||
    schedule.health === "done_late" ||
    schedule.alertLevel === "danger";
  const warn = !late && (schedule.alertLevel === "warn" || schedule.health === "at_risk");

  if (late) {
    return {
      base: "rgba(42, 28, 32, 0.9)",
      baseActive: "rgba(52, 34, 38, 0.94)",
      fill: "linear-gradient(90deg, rgba(239,68,68,0.22) 0%, rgba(251,113,133,0.14) 100%)",
    };
  }
  if (warn) {
    return {
      base: "rgba(38, 34, 26, 0.9)",
      baseActive: "rgba(48, 42, 30, 0.94)",
      fill: "linear-gradient(90deg, rgba(245,158,11,0.2) 0%, rgba(251,191,36,0.12) 100%)",
    };
  }
  return {
    base: "rgba(20, 32, 48, 0.9)",
    baseActive: "rgba(28, 42, 58, 0.94)",
    fill: "linear-gradient(90deg, rgba(34,197,94,0.2) 0%, rgba(45,212,191,0.12) 100%)",
  };
}

/** Màu đoạn: xanh (ổn) → vàng/cam (còn 1–2 ngày) → đỏ (quá hạn) */
function phaseScheduleColor(
  phase: ProjectGanttPhase,
  today: string,
  rangeEnd: string
): string {
  if (isPhaseOverdue(phase, today, rangeEnd)) return "#ef4444";
  if (phase.status === "done") return "#22c55e";
  const daysLeft = daysBetween(today, rangeEnd);
  if (daysLeft <= 2 && daysLeft >= 0) return "#f59e0b";
  return "#22c55e";
}

function isPhaseOverdue(
  phase: ProjectGanttPhase,
  today: string,
  rangeEnd: string
): boolean {
  return phase.status !== "done" && rangeEnd < today;
}

function phaseSegmentTooltip(
  phase: ProjectGanttPhase,
  rangeStart: string,
  rangeEnd: string,
  fillPct: number,
  today: string
): string {
  const color = phaseScheduleColor(phase, today, rangeEnd);
  const status =
    color === "#ef4444"
      ? "Quá deadline"
      : color === "#f59e0b"
      ? "Sắp đến hạn (1–2 ngày)"
      : phase.status === "done"
      ? "Hoàn thành"
      : "Đúng tiến độ";
  return `${phase.name}\n${fmtVN(rangeStart)} → ${fmtVN(rangeEnd)}\n${status} · ${fillPct}%`;
}

/** Ưu tiên khi card hẹp: ẩn % / nhãn dài trước */
function cardLabelVisibility(barWidth: number) {
  const showCode = barWidth >= 100;
  const showDays = barWidth >= 88;
  return {
    padX: barWidth < 80 ? 4 : barWidth < 140 ? 6 : 10,
    showMeta: showCode || showDays,
    showDays,
    showCode,
    showProgress: barWidth >= 118,
    showProgressLabel: barWidth >= 280,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6 && raw.length !== 3) return `rgba(148,163,184,${alpha})`;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function phaseFillPercent(phase: ProjectGanttPhase): number {
  if (phase.status === "done") return 100;
  if (phase.status === "pending") return 0;
  const pct = Math.min(100, Math.max(0, phase.progressPercent ?? 0));
  if (phase.status === "in_progress" || phase.status === "delayed") {
    return pct;
  }
  return 0;
}

function computeCardProgress(project: ProjectSummary, fallback: number): number {
  const phases = project.phases ?? [];
  if (phases.length === 0) return fallback;
  const total = phases.reduce((sum, ph) => {
    const p = Math.min(100, Math.max(0, Number(ph.progressPercent ?? 0)));
    return sum + (ph.status === "done" ? 100 : p);
  }, 0);
  return Math.round(total / phases.length);
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00`);
  const b = Date.parse(`${toIso}T00:00:00`);
  return Math.round((b - a) / (24 * 3600 * 1000));
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function FloatingControls({
  onPrev,
  onToday,
  onNext,
}: {
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 14,
        zIndex: 20,
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 9999,
        background: "rgba(10,17,32,0.85)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(139,156,181,0.25)",
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        className="p-1.5 rounded-full hover:bg-white/10 text-slate-300"
        title="Lùi 1 tuần"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        type="button"
        onClick={onToday}
        className="px-3 py-1 rounded-full hover:bg-white/10 text-slate-200 text-xs inline-flex items-center gap-1"
      >
        <Calendar size={12} /> Hôm nay
      </button>
      <button
        type="button"
        onClick={onNext}
        className="p-1.5 rounded-full hover:bg-white/10 text-slate-300"
        title="Tiến 1 tuần"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function computeRange(projects: ProjectSummary[]): { from: string; to: string } {
  const today = todayIso();
  const candidates: string[] = [today];
  for (const p of projects) {
    if (p.startDate) candidates.push(p.startDate);
    if (p.expectedEndDate) candidates.push(p.expectedEndDate);
    if (p.actualEndDate) candidates.push(p.actualEndDate);
    if (!p.startDate && !p.expectedEndDate) {
      const created = toLocalDateString(p.createdAt);
      if (created) candidates.push(created);
    }
    for (const ph of p.phases ?? []) {
      const started = toLocalDateString(ph.startedAt);
      const deadline = toLocalDateString(ph.deadlineAt);
      if (started) candidates.push(started);
      if (deadline) candidates.push(deadline);
    }
  }
  const valid = [...new Set(candidates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  const lo = valid[0] ?? today;
  const hi = valid[valid.length - 1] ?? today;
  return {
    from: shiftDate(lo, -GANTT_LEFT_PAD_DAYS),
    to: shiftDate(hi, 14),
  };
}

/** Thêm cột ngày trống phía sau — giữ đúng px/ô nhưng lưới full chiều ngang màn hình */
function padDaysToFillViewport(
  days: string[],
  viewportW: number,
  cellW: number
): string[] {
  if (!days.length || viewportW <= 0 || cellW <= 0) return days;
  const minDays = Math.ceil(viewportW / cellW);
  if (days.length >= minDays) return days;
  const out = [...days];
  let last = days[days.length - 1];
  while (out.length < minDays) {
    last = shiftDate(last, 1);
    out.push(last);
  }
  return out;
}

function enumerateDays(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from.slice(0, 10)}T12:00:00`);
  const stop = new Date(`${to.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(stop.getTime())) {
    const today = todayIso();
    return enumerateDays(shiftDate(today, -GANTT_LEFT_PAD_DAYS), shiftDate(today, 45));
  }
  while (d <= stop) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function shiftDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function projectStartDay(p: ProjectSummary, fallback: string): string {
  return p.startDate || toLocalDateString(p.createdAt) || fallback;
}

function fmtVN(iso: string): string {
  return formatDateVi(iso);
}
