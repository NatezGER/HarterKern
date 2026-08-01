import { Crown, Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

const sizes = {
  compact: "size-8",
  standard: "size-11",
  featured: "size-14 sm:size-20",
} as const;

const materials = {
  2: "border-slate-200/70 bg-gradient-to-br from-white via-slate-300 to-slate-600 text-slate-950 shadow-[0_0_18px_rgba(226,232,240,.2)]",
  3: "border-orange-200/60 bg-gradient-to-br from-orange-200 via-orange-500 to-amber-900 text-orange-950 shadow-[0_0_18px_rgba(194,93,33,.2)]",
} as const;

export function HallOfFameRankEmblem({ place, size = "standard", className }: { place: 1 | 2 | 3; size?: keyof typeof sizes; className?: string }) {
  if (place === 1) {
    return <span data-hall-of-fame-emblem="crown" data-place={place} aria-label="Weltrang 1" className={cn("grid shrink-0 place-items-center text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,.4)]", sizes[size], className)}>
      <Crown aria-hidden="true" className="size-full fill-yellow-400/25 stroke-[1.6]" />
    </span>;
  }

  const material = place === 2 ? "silver-laurel" : "bronze-laurel";
  return <span data-hall-of-fame-emblem={material} data-place={place} aria-label={`Weltrang ${place}`} className={cn("relative grid shrink-0 place-items-center rounded-full border", sizes[size], materials[place], className)}>
    <Leaf aria-hidden="true" className="absolute left-[2%] top-[14%] h-[72%] w-[48%] -rotate-[28deg] fill-current/25 stroke-[1.6]" />
    <Leaf aria-hidden="true" className="absolute right-[2%] top-[14%] h-[72%] w-[48%] rotate-[28deg] -scale-x-100 fill-current/25 stroke-[1.6]" />
    <strong className="relative font-display text-[0.62em] font-black">{place}</strong>
  </span>;
}
