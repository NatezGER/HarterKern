import { Check, Crosshair, LockKeyhole, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { MostWantedEnding, MostWantedSnapshot } from "@/types";
import { formatDate, formatTime } from "@/utils/format";

export function MostWantedMatrix({ data }: { data: MostWantedSnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<MostWantedEnding | null>(null);
  return (
    <div className="panel overflow-hidden p-4 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold-300">Liga-Jagd</p>
          <h3 className="display-title mt-2 text-3xl sm:text-4xl">Most Wanted · 00–99</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Jede Nachkommastellen-Kombination zählt einmal. Der erste offizielle Treffer verewigt den Finder.
          </p>
        </div>
        <p className="font-display text-4xl font-black text-gold-300">{data.reached}<span className="text-xl text-white/25">/{data.total}</span></p>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-label="Most-Wanted-Fortschritt" aria-valuemin={0} aria-valuemax={data.total} aria-valuenow={data.reached}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-yellow-300 transition-[width]" style={{ width: `${data.percent}%` }} />
      </div>
      <Button type="button" variant="outline" className="mt-5 w-full sm:w-auto" aria-expanded={expanded} aria-controls="most-wanted-grid" onClick={() => setExpanded((value) => !value)}>{expanded ? "Matrix einklappen" : "10×10-Matrix anzeigen"}</Button>
      <div id="most-wanted-grid" hidden={!expanded} className="mt-5 grid grid-cols-10 gap-1 sm:gap-1.5" role="grid" aria-label="Matrix der Nachkommastellen 00 bis 99">
        {data.endings.map((ending) => (
          <button
            key={ending.ending}
            type="button"
            onClick={() => setSelected(ending)}
            aria-label={`${ending.label}: ${ending.achieved ? `gefunden von ${ending.playerName}` : "noch offen"}`}
            role="gridcell"
            className={cn(
              "group relative aspect-square min-w-0 rounded-md border text-[9px] font-black tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 sm:rounded-lg sm:text-xs",
              ending.achieved
                ? "border-emerald-300/25 bg-emerald-300/[0.09] text-emerald-100 hover:bg-emerald-300/[0.16]"
                : "border-white/[0.07] bg-black/25 text-white/25 hover:border-white/15 hover:text-white/45",
            )}
          >
            {ending.label}
            {ending.achieved && <Check className="absolute right-0 top-0 size-2.5 text-emerald-300 sm:right-1 sm:top-1 sm:size-3" />}
          </button>
        ))}
      </div>
      <ul className="sr-only">
        {data.endings.map((ending) => <li key={`text-${ending.ending}`}>Endung {ending.label}: {ending.achieved ? `zuerst von ${ending.playerName} mit ${ending.timeHundredths == null ? "unbekannter Zeit" : formatTime(ending.timeHundredths / 100)}` : "offen"}</li>)}
      </ul>
      {selected && <EndingDetail ending={selected} onClose={() => setSelected(null)} />}
      <div className="mt-5 grid gap-3 text-xs text-white/40 sm:grid-cols-3">
        <p><strong className="text-white/75">Offen:</strong> {data.openEndings.length}</p>
        <p><strong className="text-white/75">Häufigste Endung:</strong> {data.mostCommonEnding == null ? "—" : String(data.mostCommonEnding).padStart(2, "0")} ({data.mostCommonHits}×)</p>
        <p><strong className="text-white/75">Seltenste Treffer:</strong> {data.rarestAchievedEndings.length ? data.rarestAchievedEndings.map((value) => String(value).padStart(2, "0")).join(", ") : "—"}</p>
      </div>
    </div>
  );
}

function EndingDetail({ ending, onClose }: { ending: MostWantedEnding; onClose: () => void }) {
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
      {!ending.achieved && <p className="mt-4 flex items-center gap-2 text-xs text-white/35"><Crosshair className="size-4" /> Diese Endung steht noch auf der Fahndungsliste.</p>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <p><span className="block text-[9px] uppercase tracking-[0.14em] text-white/25">{label}</span><span className="mt-1 block font-bold text-white/70">{value}</span></p>;
}
