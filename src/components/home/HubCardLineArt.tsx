import type { ReactNode } from "react";

/** Minh họa line đơn sắc xanh — mỗi card một motif, đồng bộ brand Hoa Phong */

const strokeProps = {
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function LineDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3B9FE8" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#6BB8F0" stopOpacity="0.95" />
      </linearGradient>
    </defs>
  );
}

export type HubIllustrationId = "contact" | "services" | "products" | "about" | "blog" | "erp";

export function HubCardLineArt({
  id,
  className = "",
}: {
  id: HubIllustrationId;
  className?: string;
}) {
  const gradId = `hp-line-${id}`;

  const art: Record<HubIllustrationId, ReactNode> = {
    contact: (
      <>
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.6" d="M28 72h48l-8 14H36l-8-14z" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.4" d="M38 58c0-12 10-22 22-22s22 10 22 22-10 22-22 22" opacity="0.7" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.2" d="M52 52v8M60 48v12M68 52v8" opacity="0.5" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" d="M12 88c8-16 24-28 44-32" opacity="0.35" />
      </>
    ),
    services: (
      <>
        <rect {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" x="18" y="28" width="56" height="40" rx="3" opacity="0.6" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.6" d="M26 68h52M34 28V20M58 28V16" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.4" d="M30 44h32M30 52h24" opacity="0.75" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.8" d="M72 72L88 56" />
        <circle {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" cx="88" cy="52" r="10" opacity="0.5" />
      </>
    ),
    products: (
      <>
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" d="M24 76V44l28-16 28 16v32" opacity="0.55" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.6" d="M52 28v48M24 44l28 16 28-16" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.3" d="M36 52h32M36 60h24M36 68h16" opacity="0.7" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.2" d="M8 80h88" opacity="0.3" />
      </>
    ),
    about: (
      <>
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="2" d="M16 84C28 68 40 52 56 36" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.7" d="M16 84C32 72 48 60 68 48" opacity="0.75" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.4" d="M16 84C36 78 56 72 80 64" opacity="0.5" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" d="M58 36V20h28v64H42" opacity="0.45" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.2" d="M50 52h20M50 60h14" opacity="0.4" />
      </>
    ),
    blog: (
      <>
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" d="M22 24h52v56H22z" opacity="0.35" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.6" d="M30 32h44v48H30z" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" d="M38 24h44v56H38z" opacity="0.65" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.2" d="M38 44h28M38 52h22M38 60h26M38 68h16" opacity="0.8" />
      </>
    ),
    erp: (
      <>
        <rect {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.5" x="14" y="22" width="72" height="58" rx="4" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.2" d="M14 38h72M38 38v42M58 38v42" opacity="0.5" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.6" d="M24 58h12M24 66h8" />
        <path {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.6" d="M44 52l8-10 8 6 12-16" opacity="0.85" />
        <circle {...strokeProps} stroke={`url(#${gradId})`} strokeWidth="1.3" cx="68" cy="62" r="6" opacity="0.5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
    >
      <LineDefs id={gradId} />
      {art[id]}
    </svg>
  );
}
