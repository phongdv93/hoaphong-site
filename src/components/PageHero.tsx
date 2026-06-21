export function PageHero({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-navy text-white pt-[4.25rem] pb-12 md:pb-16 px-4 md:px-8">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-royal/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="container-narrow relative z-10 text-center max-w-7xl mx-auto">
        {badge && (
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-sky-light text-sm font-medium mb-4 tracking-wide">
            {badge}
          </span>
        )}
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">{title}</h1>
        {subtitle && <p className="text-lg text-slate-muted max-w-2xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  );
}
