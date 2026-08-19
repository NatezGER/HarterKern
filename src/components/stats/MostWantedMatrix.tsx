import { Check, Crosshair, LockKeyhole, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { selectionAfterSeasonChange } from "@/components/stats/mostWantedSelection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { MostWantedEnding, MostWantedSnapshot } from "@/types";
import { formatDate, formatTime } from "@/utils/format";
import { ALL_TIME_SEASON } from "@/lib/season";
import type { SeasonSelection } from "@/lib/season";

export function MostWantedMatrix({ data, season = ALL_TIME_SEASON }: {
  data: MostWantedSnapshot;
  season?: SeasonSelection;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<MostWantedEnding | null>(null);
  const selectedSeason = useRef(season);
  const visibleSelected = selectedSeason.current === season ? selected : null;
  useEffect(() => {
    setSelected((current) => selectionAfterSeasonChange(
      current, selectedSeason.current, season,
    ));
    selectedSeason.current = season;
  }, [season]);
  return (
    <div className="panel overflow-hidden p-4 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn("text-xs font-black uppercase tracking-[0.2em]",
            season === ALL_TIME_SEASON ? "text-gold-300" : "text-emerald-300")}>
            {season === ALL_TIME_SEASON ? "Liga-Jagd" : `Saison ${season}`}
          </p>
          <h3 className="display-title mt-2 text-3xl sm:text-4xl">Most Wanted · 00–99</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Jede Nachkommastellen-Kombination zählt einmal. Der erste offizielle Treffer verewigt den Finder.
          </p>
        </div>
        <p className={cn("font-display text-4xl font-black",
          season === ALL_TIME_SEASON ? "text-gold-300" : "text-emerald-300")}>{data.reached}<span className="text-xl text-white/25">/{data.total}</span></p>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-label="Most-Wanted-Fortschritt" aria-valuemin={0} aria-valuemax={data.total} aria-valuenow={data.reached}>
        <div className={cn("h-full rounded-full transition-[width]",
          season === ALL_TIME_SEASON
            ? "bg-gradient-to-r from-amber-600 to-yellow-300"
            : "bg-gradient-to-r from-emerald-700 to-emerald-300")} style={{ width: `${data.percent}%` }} />
      </div>
      {season !== ALL_TIME_SEASON && data.reached === 0 && (
        <p className="mt-4 text-sm text-white/40">In Saison {season} wurde noch keine Endung gefunden.</p>
      )}
      <Button type="button" variant="outline" className="mt-5 w-full sm:w-auto" aria-expanded={expanded} aria-controls="most-wanted-grid" onClick={() => setExpanded((value) => !value)}>{expanded ? "Matrix einklappen" : "10×10-Matrix anzeigen"}</Button>
      <div id="most-wanted-grid" hidden={!expanded} className="mx-auto mt-5 grid max-w-3xl grid-cols-10 gap-1" role="grid" aria-label="Matrix der Nachkommastellen 00 bis 99">
        {data.endings.map((ending) => (
          <button
            key={ending.ending}
            type="button"
            onClick={() => setSelected(ending)}
            aria-label={`${ending.label}: ${ending.achieved ? `gefunden von ${ending.playerName}` : "noch offen"}`}
            role="gridcell"
            className={cn(
              "group relative aspect-square min-w-0 rounded-md border text-[9px] font-black tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:text-[11px]",
              ending.achieved
                ? "border-emerald-300/25 bg-emerald-300/[0.09] text-emerald-100 hover:bg-emerald-300/[0.16]"
                : "border-white/[0.07] bg-black/25 text-white/25 hover:border-white/15 hover:text-white/45",
            )}
          >
            {!ending.achieved && <span className="absolute left-0.5 top-0.5 sm:left-1 sm:top-1">{ending.label}</span>}
            {ending.achieved && ending.playerName && ending.avatarUrl && <img
              src={ending.avatarUrl}
              alt=""
              className="absolute inset-0.5 size-[calc(100%-0.25rem)] rounded-[0.3rem] object-cover object-center opacity-90 transition group-hover:opacity-100"
            />}
            {ending.achieved && ending.playerName && !ending.avatarUrl && <ProfileAvatar
              id={ending.playerId ?? ending.guestId ?? ending.label}
              name={ending.playerName}
              url={null}
              className="absolute inset-1 size-[calc(100%-0.5rem)] text-[8px] ring-0 sm:text-xs"
            />}
            {ending.achieved && !ending.playerName && <Check className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-emerald-300 sm:size-7" />}
          </button>
        ))}
      </div>
      <ul className="sr-only">
        {data.endings.map((ending) => <li key={`text-${ending.ending}`}>Endung {ending.label}: {ending.achieved ? `zuerst von ${ending.playerName} mit ${ending.timeHundredths == null ? "unbekannter Zeit" : formatTime(ending.timeHundredths / 100)}` : "offen"}</li>)}
      </ul>
      {visibleSelected && <EndingDetail ending={visibleSelected} onClose={() => setSelected(null)} />}
      <div className="mt-5 grid gap-3 text-xs text-white/40 sm:grid-cols-2">
        <p><strong className="text-white/75">Offen:</strong> {data.openEndings.length}</p>
        <p><strong className="text-white/75">Häufigste Endung:</strong> {data.mostCommonEnding == null ? "—" : String(data.mostCommonEnding).padStart(2, "0")} ({data.mostCommonHits}×)</p>
      </div>
      {data.topHunters.length > 0 && <section className="mt-5 border-t border-white/[0.07] pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Top 5 Hunter</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-5">
          {data.topHunters.map((hunter, index) => <li key={hunter.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2">
            <span className="w-4 text-[10px] font-black text-white/25">{index + 1}</span>
            <ProfileAvatar id={hunter.playerId} name={hunter.playerName} url={hunter.avatarUrl} className="size-7" />
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-white/70">{hunter.playerName}</span>
            <strong className="font-display text-lg text-gold-300">{hunter.endingCount}</strong>
          </li>)}
        </ol>
      </section>}
    </div>
  );
}

export function EndingDetail({ ending, onClose }: { ending: MostWantedEnding; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {ending.achieved && ending.playerName ? <ProfileAvatar id={ending.playerId ?? ending.guestId ?? ending.label} name={ending.playerName} url={ending.avatarUrl} className="size-11" /> : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/[0.05] text-white/25"><LockKeyhole className="size-4" /></span>}
          <div className="min-w-0">
            <p className="font-display text-2xl font-black">.{ending.label}</p>
            <p className="truncate text-sm text-white/55">{ending.achieved ? `${ending.playerName}${ending.isGuest ? " · Gast" : ""}` : "Noch nicht gefunden"}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Detail schließen"><X className="size-4" /></Button>
      </div>
      {ending.achieved && <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
        <Detail label="Erster Treffer" value={ending.timeHundredths == null ? "—" : formatTime(ending.timeHundredths / 100)} />
        <Detail label="Datum" value={ending.occurredDate ? formatDate(ending.occurredDate) : "—"} />
        <Detail label="Uhrzeit" value={ending.hasExactTime && ending.occurredAt ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(ending.occurredAt)) : "Nicht überliefert"} />
        <Detail label="Quelle" value={ending.sourceLabel ?? (ending.sourceType === "historical_attempt" ? "Historischer Versuch" : "—")} />
        <Detail label="Treffer gesamt" value={String(ending.hitCount)} />
        <Detail label="Spieler/Gäste" value={String(ending.participantCount)} />
      </div>}
      {ending.additionalHits.length > 0 && <div className="mt-4 border-t border-white/[0.07] pt-4">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">Weitere Treffer</p>
        <ul className="mt-2 divide-y divide-white/[0.05]">
          {ending.additionalHits.map((hit) => <li key={hit.id} className="flex items-center gap-2 py-2 text-xs">
            <ProfileAvatar id={hit.playerId ?? hit.guestId ?? hit.id} name={hit.playerName} url={hit.avatarUrl} className="size-7" />
            <span className="min-w-0 flex-1 truncate font-semibold text-white/65">{hit.playerName}{hit.isGuest ? " · Gast" : ""}</span>
            <strong className="font-display text-sm text-white/80">{formatTime(hit.timeHundredths / 100)}</strong>
          </li>)}
        </ul>
      </div>}
      {!ending.achieved && <p className="mt-4 flex items-center gap-2 text-xs text-white/35"><Crosshair className="size-4" /> Diese Endung steht noch auf der Fahndungsliste.</p>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p><span className="block text-[9px] uppercase tracking-[0.14em] text-white/25">{label}</span><span className="mt-1 block font-bold text-white/70">{value}</span></p>;
}
