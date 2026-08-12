import { useSeason } from "@/hooks/useSeason";

export function SeasonContextBadge() {
  const { season, isAllTime } = useSeason();
  if (isAllTime) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-300/[0.12] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 shadow-[0_0_24px_rgba(110,231,183,0.12)]">
      <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
      Saison {season}
    </span>
  );
}
