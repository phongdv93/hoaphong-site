export function DbSetupBanner() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100 space-y-2 mb-6">
      <p className="font-semibold text-amber-200">Chưa kết nối PostgreSQL</p>
      <p className="text-slate-300">
        Thêm <code className="bg-white/10 px-1 rounded text-amber-100">DATABASE_URL</code> vào file{" "}
        <code className="bg-white/10 px-1 rounded text-amber-100">.env</code> rồi restart <code className="text-slate-200">npm run dev</code>:
      </p>
      <pre className="bg-black/30 p-3 rounded text-xs overflow-x-auto border border-amber-500/30 text-slate-200">
        DATABASE_URL=postgresql://hoaphong:hoaphong@localhost:5432/hoaphong
      </pre>
      <p className="text-xs">
        Sau đó: <code>npm run db:seed</code> và <code>npm run db:seed-wood</code>
      </p>
    </div>
  );
}
