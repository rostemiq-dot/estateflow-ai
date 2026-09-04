import { Building2, LoaderCircle } from "lucide-react";

export function AppStartupScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-white" aria-busy="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(245,158,11,0.16),transparent_38%),radial-gradient(circle_at_20%_80%,rgba(148,163,184,0.08),transparent_30%)]" />
      <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl motion-safe:animate-pulse" />
      <div className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-white/5 blur-3xl motion-safe:animate-pulse" />

      <section className="relative z-10 w-full max-w-md text-center motion-safe:animate-[fade-in_500ms_ease-out]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/20 bg-white/10 shadow-2xl shadow-amber-500/10 backdrop-blur-xl">
          <Building2 size={38} strokeWidth={1.7} className="text-amber-300" aria-hidden="true" />
        </div>
        <p className="mt-7 text-2xl font-black tracking-tight">EstateFlow</p>
        <p className="mt-2 text-sm font-medium tracking-wide text-slate-400">Real Estate Management Platform</p>
        <div className="mx-auto mt-10 flex items-center justify-center gap-3 text-sm text-slate-300">
          <LoaderCircle size={17} className="motion-safe:animate-spin text-amber-300" aria-hidden="true" />
          <span>Preparing your workspace…</span>
        </div>
        <div className="mx-auto mt-5 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 rounded-full bg-amber-400 motion-safe:animate-[loading-bar_1.2s_ease-in-out_infinite]" />
        </div>
      </section>
    </main>
  );
}
