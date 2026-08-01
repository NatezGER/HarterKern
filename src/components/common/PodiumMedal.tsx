import { cn } from "@/lib/cn";

const colors = {
  1: "from-yellow-100 via-yellow-400 to-amber-800 text-amber-950 shadow-[0_0_18px_rgba(250,204,21,.28)]",
  2: "from-white via-slate-300 to-slate-700 text-slate-900 shadow-[0_0_16px_rgba(203,213,225,.2)]",
  3: "from-orange-200 via-orange-500 to-amber-950 text-orange-950 shadow-[0_0_16px_rgba(194,93,33,.22)]",
} as const;

const ribbon = "from-red-500 via-red-800 to-red-950";

export function PodiumMedal({ rank, size = "md", className }: { rank: 1 | 2 | 3; size?: "sm" | "md" | "lg"; className?: string }) {
  return <span data-podium-medal={rank} aria-label={`Platz ${rank}`} className={cn("relative isolate inline-grid shrink-0 place-items-end", size === "sm" ? "h-11 w-9" : size === "lg" ? "h-16 w-12 sm:h-24 sm:w-20" : "h-14 w-10 sm:h-20 sm:w-14", className)}>
    <i className={cn("absolute left-[18%] top-0 h-[52%] w-[34%] -rotate-6 bg-gradient-to-b", ribbon)} style={{ clipPath: "polygon(0 0, 100% 0, 82% 100%, 50% 76%, 18% 100%)" }} />
    <i className={cn("absolute right-[18%] top-0 h-[52%] w-[34%] rotate-6 bg-gradient-to-b", ribbon)} style={{ clipPath: "polygon(0 0, 100% 0, 82% 100%, 50% 76%, 18% 100%)" }} />
    <i className={cn("relative grid aspect-square w-[78%] place-items-center rounded-full border-2 border-white/45 bg-gradient-to-br p-[2px]", colors[rank])}>
      <i className="grid size-full place-items-center rounded-full border border-black/20 bg-inherit shadow-[inset_0_2px_4px_rgba(255,255,255,.35),inset_0_-3px_5px_rgba(0,0,0,.25)]">
        <strong className={cn("font-display font-black", size === "sm" ? "text-xs" : size === "lg" ? "text-lg sm:text-3xl" : "text-base sm:text-xl")}>{rank}</strong>
      </i>
    </i>
  </span>;
}
