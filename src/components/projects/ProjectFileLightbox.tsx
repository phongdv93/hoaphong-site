"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxImage = { url: string; name: string };

export function ProjectFileLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const img = images[index];
  const hasMany = images.length > 1;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMany) {
        onIndexChange((index - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight" && hasMany) {
        onIndexChange((index + 1) % images.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onIndexChange, index, images.length, hasMany]);

  if (!img) return null;

  const node = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/92 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10"
        aria-label="Đóng"
      >
        <X size={22} />
      </button>
      {hasMany && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + images.length) % images.length);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % images.length);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Ảnh sau"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt={img.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100vh-5rem)] max-w-full object-contain select-none"
      />
      <p className="mt-3 text-xs text-slate-300 text-center max-w-lg truncate">
        {img.name}
        {hasMany && (
          <span className="text-slate-500 ml-2">
            {index + 1} / {images.length}
          </span>
        )}
      </p>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
