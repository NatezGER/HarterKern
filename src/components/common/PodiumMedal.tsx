import { cn } from "@/lib/cn";
import { AwardAssetImage } from "@/components/common/AwardAssetImage";
import { medalAssetId } from "@/lib/awardAssets";

const colors = { 1: "#e8bc54", 2: "#cbd5e1", 3: "#c98248" };

export function PodiumMedal({ rank, size = "md", className }: { rank: 1 | 2 | 3; size?: "sm" | "md" | "lg"; className?: string }) {
  return <span data-podium-medal={rank} aria-label={`Platz ${rank}`} className={cn("relative isolate inline-block shrink-0", size === "sm" ? "h-11 w-10" : size === "lg" ? "h-16 w-14 sm:h-24 sm:w-20" : "h-14 w-12 sm:h-20 sm:w-[4.25rem]", className)}>
    <AwardAssetImage assetId={medalAssetId(rank)} alt={`Platz ${rank}`} fallback={<svg viewBox="0 0 100 100" className="size-full" aria-hidden="true" fill={colors[rank]}>
      <path d="M46 88C13 77 9 43 26 15M54 88C87 77 91 43 74 15" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: colors[rank] }} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <g key={i} transform={`rotate(${-50 + i * 14} 50 50)`}><ellipse cx="16" cy="50" rx="5" ry="10" transform="rotate(-35 16 50)" /></g>)}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <g key={i} transform={`rotate(${50 - i * 14} 50 50)`}><ellipse cx="84" cy="50" rx="5" ry="10" transform="rotate(35 84 50)" /></g>)}
      <text x="50" y="65" textAnchor="middle" fontSize="42" fontWeight="900">{rank}</text>
    </svg>} />
  </span>;
}
