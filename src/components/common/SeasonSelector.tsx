import { getSeasonOptions } from "@/lib/season";
import { useSeason } from "@/hooks/useSeason";
import { cn } from "@/lib/cn";

export function SeasonSelector() {
  const { season, setSeason, isAllTime } = useSeason();
  const options = getSeasonOptions(new Date().getFullYear(), season);

  return (
    <label className="relative">
      <span className="sr-only">Saison auswählen</span>
      <select
        aria-label="Saison auswählen"
        value={String(season)}
        onChange={(event) => {
          const value = event.target.value;
          setSeason(value === "all-time" ? "all-time" : Number(value));
        }}
        className={cn(
          "h-9 cursor-pointer appearance-none rounded-full border bg-black/30 py-1 pl-3 pr-7 text-[10px] font-bold uppercase tracking-[0.12em] outline-none transition sm:h-auto sm:py-1.5",
          isAllTime
            ? "border-gold-400/20 bg-gold-400/[0.07] text-gold-300 focus:border-gold-400/60"
            : "border-emerald-300/35 bg-emerald-300/[0.09] text-emerald-200 shadow-[0_0_18px_rgba(110,231,183,0.08)] focus:border-emerald-200/70",
        )}
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#171917] text-white">
            {option === "all-time" ? "Ewig" : option}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-2.5 top-1/2 size-1.5 -translate-y-1/2 rotate-45 border-b border-r",
          isAllTime ? "border-gold-300" : "border-emerald-200",
        )}
      />
    </label>
  );
}
