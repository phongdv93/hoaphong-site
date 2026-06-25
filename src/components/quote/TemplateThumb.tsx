import type { PdfTemplateMeta } from "@/lib/quote/pdf-templates";
import { primaryColorForTemplate } from "@/lib/quote/pdf-templates";

/** Thumbnail minh họa bố cục — không chỉ thanh màu. */
export function TemplateThumb({ template, active }: { template: PdfTemplateMeta; active: boolean }) {
  const color = primaryColorForTemplate(template.id);
  const v = template.preview;

  return (
    <div
      className={`relative h-[52px] w-full rounded-md border overflow-hidden mb-2 ${
        active ? "border-white/40" : "border-white/15 bg-white"
      }`}
      aria-hidden
    >
      {v === "classic" && (
        <div className="h-full p-1.5 flex flex-col">
          <div className="flex gap-1 mb-1">
            <div className="w-3 h-2 rounded-sm bg-gray-200 shrink-0" />
            <div className="flex-1 h-2 rounded-sm" style={{ background: `${color}33` }} />
            <div className="w-4 h-2 rounded-sm bg-gray-100 shrink-0" />
          </div>
          <div className="flex gap-1 flex-1">
            <div className="flex-1 rounded-sm border border-gray-200" />
            <div className="flex-1 rounded-sm border border-gray-200" />
          </div>
          <div className="h-2 mt-1 rounded-sm" style={{ background: `${color}22` }} />
        </div>
      )}
      {v === "minimal" && (
        <div className="h-full p-2 flex flex-col justify-between">
          <div className="h-2 w-2/3 rounded-sm bg-gray-300" />
          <div className="space-y-0.5">
            <div className="h-0.5 w-full bg-gray-200" />
            <div className="h-0.5 w-4/5 bg-gray-200" />
            <div className="h-0.5 w-full bg-gray-200" />
          </div>
        </div>
      )}
      {v === "modern" && (
        <div className="h-full flex">
          <div className="w-[30%] h-full shrink-0" style={{ background: color }} />
          <div className="flex-1 p-1.5 flex flex-col gap-1">
            <div className="h-2 rounded-sm" style={{ background: `${color}44` }} />
            <div className="flex-1 rounded-sm border border-gray-200" />
          </div>
        </div>
      )}
      {v === "formal" && (
        <div className="h-full p-1 border-2 border-double border-gray-400 m-0.5 flex flex-col items-center justify-center gap-1">
          <div className="h-1.5 w-1/2 bg-gray-400 rounded-sm" />
          <div className="flex gap-1 w-full px-1">
            <div className="flex-1 h-3 border border-gray-300 rounded-sm" />
            <div className="flex-1 h-3 border border-gray-300 rounded-sm" />
          </div>
        </div>
      )}
      {v === "striped" && (
        <div className="h-full flex flex-col">
          <div className="h-[38%] w-full shrink-0" style={{ background: color }} />
          <div className="flex-1 p-1">
            <div className="h-full rounded-sm border border-gray-200" />
          </div>
        </div>
      )}
      {v === "compact" && (
        <div className="h-full p-1.5 text-[6px] flex flex-col gap-0.5">
          <div className="flex gap-0.5">
            <span className="px-1 py-0.5 rounded bg-gray-100">#</span>
            <span className="px-1 py-0.5 rounded bg-gray-100">date</span>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-px bg-gray-200 rounded overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white h-1" />
            ))}
          </div>
        </div>
      )}
      {v === "hoaphong" && (
        <div className="h-full flex flex-col">
          <div className="h-[42%] w-full shrink-0 bg-gradient-to-r from-purple-800 to-purple-600" />
          <div className="flex-1 p-1 flex gap-1">
            <div className="flex-1 rounded border border-purple-200" />
            <div className="flex-1 rounded border border-purple-200" />
          </div>
        </div>
      )}
    </div>
  );
}
