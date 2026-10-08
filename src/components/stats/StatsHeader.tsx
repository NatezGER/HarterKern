import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";

export function StatsHeader({ title }: { title: string }) {
  return <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
    <h1 className="display-title text-2xl sm:text-4xl"><span className="sm:hidden">Statistiken</span><span className="hidden sm:inline">{title}</span></h1>
    <SeasonContextBadge />
  </header>;
}
