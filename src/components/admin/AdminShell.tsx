import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="flex min-h-screen bg-[#0a1120]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-[#0a1120]">
        <header className="bg-[#0a1120] border-b border-white/10 px-8 py-5">
          <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
        </header>
        <div className="p-8 text-slate-200">{children}</div>
      </main>
    </div>
  );
}
