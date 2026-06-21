/** Icon mark Hoa Phong — 4 đường cong gradient xanh (theo mẫu brand bạn đã gửi) */
export function LogoIcon({
  className = "w-10 h-10",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  const stroke = light ? "url(#hp-grad-light)" : "url(#hp-grad)";

  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id="hp-grad" x1="8" y1="42" x2="42" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B9FE8" />
          <stop offset="100%" stopColor="#1E5A9E" />
        </linearGradient>
        <linearGradient id="hp-grad-light" x1="8" y1="42" x2="42" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6BB8F0" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <path d="M10 38 C18 28, 28 18, 40 10" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M10 38 C20 30, 32 22, 42 16" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" opacity="0.85" />
      <path d="M10 38 C22 32, 34 28, 44 24" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      <path d="M10 38 C24 36, 36 34, 46 32" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function Logo({
  className = "",
  light = false,
  showWordmark = false,
}: {
  className?: string;
  light?: boolean;
  showWordmark?: boolean;
}) {
  const textClass = light ? "text-white" : "text-navy";
  const lineClass = light ? "bg-white/25" : "bg-navy/15";
  const ruleClass = light ? "bg-white/35" : "bg-navy/20";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon className="w-10 h-10 shrink-0" light={light} />
      {showWordmark && (
        <>
          <span className={`w-px h-9 shrink-0 ${lineClass}`} aria-hidden />
          <div className={`flex flex-col leading-none font-light tracking-[0.28em] text-[10px] sm:text-[11px] ${textClass}`}>
            <div className="flex items-center gap-2 min-w-[88px]">
              <span className="font-normal">HOA</span>
              <span className={`h-px flex-1 min-w-[20px] max-w-[48px] ${ruleClass}`} aria-hidden />
            </div>
            <span className="mt-1.5">PHONG</span>
          </div>
        </>
      )}
    </div>
  );
}
