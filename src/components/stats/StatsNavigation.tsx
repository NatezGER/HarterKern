import { Award, ChartNoAxesCombined, LayoutDashboard, Swords, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const items = [
  { to: "/stats", label: "Übersicht", icon: LayoutDashboard, end: true },
  { to: "/stats/performance", label: "Performance", icon: ChartNoAxesCombined },
  { to: "/stats/most-wanted", label: "Most Wanted", icon: Target },
  { to: "/stats/rivalries", label: "Rivalries", icon: Swords },
  { to: "/stats/badges", label: "Badges", icon: Award },
];

export function StatsNavigation() {
  return <nav aria-label="Statistikbereiche" className="-mx-1 overflow-x-auto px-1 pb-1">
    <div className="flex min-w-max gap-2 rounded-2xl border border-white/[0.07] bg-black/20 p-1.5">
      {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}
        className={({ isActive }) => cn("flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold uppercase tracking-[0.08em] transition sm:px-4", isActive ? "bg-gold-300 text-black shadow-[0_0_20px_rgba(212,165,80,0.15)]" : "text-white/45 hover:bg-white/[0.05] hover:text-white/80")}>
        <Icon className="size-4" /> {label}
      </NavLink>)}
    </div>
  </nav>;
}
