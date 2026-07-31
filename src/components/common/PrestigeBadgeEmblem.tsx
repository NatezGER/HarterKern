import { Crown, Gem, ShieldCheck, Sparkles, Star } from "lucide-react";
import { badgeTierLabel, getBadgeCenterMark } from "@/lib/badgePresentation";
import { cn } from "@/lib/cn";
import type { BadgeTier } from "@/types/pr7Foundation";

const tierStyles: Record<BadgeTier, { shell: string; inner: string; glow: string; Icon: typeof Crown }> = {
  bronze: { shell: "from-orange-200 via-orange-500 to-amber-950", inner: "from-amber-950 via-orange-800 to-orange-300", glow: "shadow-[0_0_28px_rgba(194,93,33,.24)]", Icon: ShieldCheck },
  silver: { shell: "from-white via-slate-300 to-slate-700", inner: "from-slate-700 via-slate-500 to-slate-100", glow: "shadow-[0_0_30px_rgba(203,213,225,.22)]", Icon: Star },
  gold: { shell: "from-yellow-100 via-yellow-400 to-amber-700", inner: "from-amber-700 via-yellow-500 to-yellow-100", glow: "shadow-[0_0_34px_rgba(250,204,21,.28)]", Icon: Crown },
  diamond: { shell: "from-cyan-100 via-violet-300 to-indigo-700", inner: "from-indigo-800 via-violet-500 to-cyan-100", glow: "shadow-[0_0_38px_rgba(139,92,246,.35)]", Icon: Gem },
  special: { shell: "from-emerald-50 via-cyan-100 to-slate-500", inner: "from-slate-500 via-emerald-100 to-white", glow: "shadow-[0_0_36px_rgba(167,243,208,.3)]", Icon: Sparkles },
};

export function PrestigeBadgeEmblem({ badge, size = "md", className }: {
  badge: { badgeKey: string; tier: BadgeTier; category?: string; threshold?: number | null; name?: string };
  size?: "sm" | "md" | "lg" | "featured";
  className?: string;
}) {
  const style = tierStyles[badge.tier];
  const Icon = style.Icon;
  const mark = getBadgeCenterMark(badge);
  const rotations = badge.tier === "bronze" ? [0, 90] : badge.tier === "silver" ? [0, 45, 90] : badge.tier === "gold" ? [0, 45, 90, 135] : badge.tier === "diamond" ? [0, 30, 60, 90, 120, 150] : [0, 36, 72, 108, 144];
  return (
    <div aria-label={`${badgeTierLabel[badge.tier]}-Badge ${badge.name ?? ""}`} className={cn("relative isolate shrink-0", size === "sm" ? "size-16" : size === "md" ? "size-24" : size === "lg" ? "size-32" : "size-40", badge.tier === "diamond" && "scale-105", className)}>
      <span className={cn("absolute inset-[14%] rounded-full blur-xl opacity-70", style.glow)} />
      {rotations.map((rotation) => <span key={rotation} className={cn("absolute rounded-[22%] bg-gradient-to-br opacity-90", badge.tier === "bronze" ? "inset-[14%]" : badge.tier === "diamond" ? "inset-[2%]" : "inset-[8%]", style.shell)} style={{ transform: `rotate(${rotation}deg)`, clipPath: "polygon(50% 0, 63% 32%, 100% 50%, 63% 68%, 50% 100%, 37% 68%, 0 50%, 37% 32%)" }} />)}
      <span className={cn("absolute inset-[17%] rounded-full bg-gradient-to-br p-[3px]", style.shell, style.glow)}>
        <span className="grid size-full place-items-center rounded-full border border-white/45 bg-[#11130f] p-[5px]">
          <span className={cn("relative grid size-full place-items-center overflow-hidden rounded-full bg-gradient-to-br text-white", style.inner)}>
            <span className="absolute inset-x-1 top-1 h-[38%] rounded-full bg-white/35 blur-[1px]" />
            <Icon className="absolute size-[72%] opacity-[0.13]" />
            <strong className={cn("relative font-display font-black tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,.65)]", size === "sm" ? "text-sm" : size === "md" ? "text-lg" : size === "lg" ? "text-2xl" : "text-3xl")}>{mark}</strong>
          </span>
        </span>
      </span>
      <span className={cn("absolute bottom-[5%] left-1/2 h-[22%] w-[38%] -translate-x-1/2 bg-gradient-to-b", style.shell)} style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 50% 72%, 22% 100%)" }} />
    </div>
  );
}
