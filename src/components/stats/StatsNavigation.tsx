import { Award, ChartNoAxesCombined, LayoutDashboard, Swords, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const items = [
  { to: "/stats", label: "Übersicht", icon: LayoutDashboard, end: true },
  { to: "/stats/performance", label: "Performance", icon: ChartNoAxesCombined },
  { to: "/stats/milestones", label: "Meilensteine", icon: Target },
  { to: "/stats/rivalries", label: "Rivalries", icon: Swords },
  { to: "/stats/badges", label: "Badges", icon: Award },
];

export function StatsNavigation() {
  return <nav aria-label="Statistikbereiche" className="sticky top-20 z-30 min-w-0 rounded-2xl bg-[#111312]/95 py-1 backdrop-blur-xl">
    <div className="grid min-w-0 grid-cols-6 gap-1 rounded-2xl border border-white/[0.07] p-1 sm:flex sm:gap-2">
      {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}
        className={({ isActive }) => cn("col-span-2 flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition sm:px-4 sm:text-xs sm:uppercase [&:nth-child(n+4)]:col-span-3", isActive ? "bg-gold-300 text-black shadow-[0_0_20px_rgba(212,165,80,0.15)]" : "text-white/45 hover:bg-white/[0.05] hover:text-white/80")}>
        <Icon className="hidden size-4 shrink-0 sm:block" /> {label}
      </NavLink>)}
    </div>
  </nav>;
}
