import { getSeasonOptions } from "@/lib/season";
import { useSeason } from "@/hooks/useSeason";

export function SeasonSelector() {
  const { season, setSeason } = useSeason();
  const options = getSeasonOptions(new Date().getFullYear(), season);

  return (
    <label className="relative shrink-0">
      <span className="sr-only">Saison auswählen</span>
      <select
        aria-label="Saison auswählen"
        value={String(season)}
        onChange={(event) => {
          const value = event.target.value;
          setSeason(value === "all-time" ? "all-time" : Number(value));
        }}
        className="season-selector h-10 w-[4.75rem] cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-[10px] font-bold uppercase tracking-[0.1em] outline-none transition sm:h-auto sm:w-auto sm:py-1.5 sm:tracking-[0.12em]"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#171917] text-white">
            {option === "all-time" ? "Ewig" : option}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="season-selector-chevron pointer-events-none absolute right-2.5 top-1/2 size-1.5 -translate-y-1/2 rotate-45 border-b border-r"
      />
    </label>
  );
}
