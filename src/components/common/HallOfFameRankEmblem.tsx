import { Crown } from "lucide-react";
import { cn } from "@/lib/cn";

const sizes = {
  compact: "size-8",
  standard: "size-11",
  featured: "size-14 sm:size-20",
} as const;

const materials = {
  2: "text-slate-200 drop-shadow-[0_0_8px_rgba(226,232,240,.18)]",
  3: "text-orange-400 drop-shadow-[0_0_8px_rgba(194,93,33,.18)]",
} as const;

const numberSizes = {
  compact: "text-xl",
  standard: "text-3xl",
  featured: "text-4xl sm:text-6xl",
} as const;

export function HallOfFameRankEmblem({ place, size = "standard", className }: { place: 1 | 2 | 3; size?: keyof typeof sizes; className?: string }) {
  if (place === 1) {
    return <span data-hall-of-fame-emblem="crown" data-place={place} aria-label="Weltrang 1" className={cn("grid shrink-0 place-items-center text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,.4)]", sizes[size], className)}>
      <Crown aria-hidden="true" className="size-full fill-yellow-400/25 stroke-[1.6]" />
    </span>;
  }

  const material = place === 2 ? "silver" : "bronze";
  return <span data-hall-of-fame-emblem="rank-number" data-rank-material={material} data-place={place} aria-label={`Weltrang ${place}`} className={cn("relative grid shrink-0 place-items-center", sizes[size], materials[place], className)}>
    <strong className={cn("font-display font-black leading-none", numberSizes[size])}>{place}</strong>
    <span aria-hidden="true" className="absolute bottom-[8%] h-px w-[72%] bg-current opacity-40" />
  </span>;
}
