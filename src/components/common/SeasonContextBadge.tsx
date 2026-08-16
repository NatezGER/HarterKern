import { useSeason } from "@/hooks/useSeason";

export function SeasonContextBadge() {
  const { season, isAllTime } = useSeason();
  if (isAllTime) return null;
  return (
    <span className="season-context-badge inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
      <span className="season-context-dot size-1.5 rounded-full" />
      Saison {season}
    </span>
  );
}
