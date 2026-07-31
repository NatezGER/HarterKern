import { cn } from "@/lib/cn";

const colors = {
  1: "from-yellow-100 via-yellow-400 to-amber-800 text-amber-950 shadow-[0_0_20px_rgba(250,204,21,.3)]",
  2: "from-white via-slate-300 to-slate-700 text-slate-900 shadow-[0_0_18px_rgba(203,213,225,.22)]",
  3: "from-orange-200 via-orange-500 to-amber-950 text-orange-950 shadow-[0_0_18px_rgba(194,93,33,.24)]",
} as const;

export function PodiumMedal({ rank, size = "md", className }: { rank: 1 | 2 | 3; size?: "sm" | "md" | "lg"; className?: string }) {
  return <span aria-label={`Platz ${rank}`} className={cn("relative isolate inline-grid shrink-0 place-items-center", size === "sm" ? "size-9" : size === "lg" ? "size-20" : "size-14", className)}>
    {[0, 45, 90, 135].slice(0, rank === 1 ? 4 : rank === 2 ? 3 : 2).map((rotation) => <i key={rotation} className={cn("absolute inset-[10%] bg-gradient-to-br", colors[rank])} style={{ transform: `rotate(${rotation}deg)`, clipPath: "polygon(50% 0, 63% 34%, 100% 50%, 63% 66%, 50% 100%, 37% 66%, 0 50%, 37% 34%)" }} />)}
    <i className={cn("absolute inset-[17%] rounded-full bg-gradient-to-br p-[2px]", colors[rank])}><i className="grid size-full place-items-center rounded-full border border-white/50 bg-inherit"><strong className={cn("relative font-display font-black", size === "sm" ? "text-sm" : size === "lg" ? "text-3xl" : "text-xl")}>{rank}</strong></i></i>
  </span>;
}
