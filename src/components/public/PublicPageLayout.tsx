import type { ReactNode } from "react";

/** Nội dung trang — tiêu đề nằm trên PublicTopBar (cùng hàng menu) */
export function PublicPageLayout({
  toolbar,
  children,
  fillViewport = false,
}: {
  toolbar?: ReactNode;
  children: ReactNode;
  /** Căn nội dung + footer sát đáy viewport (vd. Về chúng tôi) */
  fillViewport?: boolean;
}) {
  return (
    <div
      className={`public-page max-w-7xl mx-auto w-full px-4 md:px-8 pt-[4.5rem] sm:pt-[4.75rem] flex flex-col ${
        fillViewport ? "flex-1 min-h-0 pb-2" : "pb-10 md:pb-12"
      }`}
    >
      {toolbar && <div className="mb-4 md:mb-5 shrink-0">{toolbar}</div>}
      <div className={fillViewport ? "flex flex-col flex-1 min-h-0" : undefined}>{children}</div>
    </div>
  );
}
