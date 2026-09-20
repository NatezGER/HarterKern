import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRankedOfficialAttempts, getTwoInSixtyHallOfFame } from "@/services/advancedHallOfFameService";
import type { RankedOfficialAttempt, TwoInSixtyEntry, TwoInSixtyMode } from "@/services/advancedHallOfFameService";
import { formatDate, formatTime } from "@/utils/format";

const time = (hundredths: number) => formatTime(hundredths / 100);

function SecretHallOfFame() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TwoInSixtyMode>("best");
  const [entries, setEntries] = useState<TwoInSixtyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(false);
    void getTwoInSixtyHallOfFame(mode).then((rows) => {
      if (active) setEntries(rows);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, open]);

  return <section className="panel p-4 sm:p-6" aria-labelledby="secret-hof-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300/65">Secret Hall of Fame</p><h2 id="secret-hof-title" className="display-title mt-1 text-2xl">2 in 60</h2></div>
      <Button type="button" variant="outline" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Secret Stats schließen" : "Secret Stats öffnen"}</Button>
    </div>
    {open && <div className="mt-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="2-in-60-Wertung">
        <Button type="button" variant={mode === "best" ? "default" : "outline"} aria-pressed={mode === "best"} onClick={() => setMode("best")}>Bester Run</Button>
        <Button type="button" variant={mode === "frequency" ? "default" : "outline"} aria-pressed={mode === "frequency"} onClick={() => setMode("frequency")}>Häufigkeit</Button>
      </div>
      {loading && <p className="mt-5 text-sm text-white/45" role="status">Secret Ranking wird geladen…</p>}
      {error && <p className="mt-5 text-sm text-red-300" role="alert">Secret Ranking ist gerade nicht verfügbar.</p>}
      {!loading && !error && entries.length === 0 && <p className="mt-5 text-sm text-white/45">Noch kein gültiger Doppelversuch.</p>}
      {!loading && !error && entries.length > 0 && <ol className="mt-5 space-y-2">{entries.map((entry) => <li key={entry.playerId} className="grid min-w-0 gap-2 rounded-xl border border-gold-400/10 bg-black/20 p-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <span className="font-display text-xl font-black text-gold-300">{entry.rank}.</span>
        <div className="min-w-0"><Link className="truncate font-bold hover:text-gold-300" to={`/player/${entry.playerId}`}>{entry.playerName}</Link><p className="mt-1 text-xs text-white/45">{entry.eventName} · {formatDate(entry.eventDate)}</p></div>
        <div className="text-sm tabular-nums sm:text-right"><strong>{time(entry.firstTimeHundredths)} + {time(entry.secondTimeHundredths)} = {time(entry.sumHundredths)}</strong><p className="text-xs text-white/45">{entry.runCount}× geschafft</p></div>
      </li>)}</ol>}
    </div>}
  </section>;
}

function AttemptRow({ entry }: { entry: RankedOfficialAttempt }) {
  const source = entry.eventName ?? entry.sourceLabel ?? "Historischer Versuch";
  return <li className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 sm:gap-4">
    <span className="font-display text-lg font-black text-white/50">{entry.rank}.</span>
    <div className="min-w-0">{entry.playerId ? <Link to={`/player/${entry.playerId}`} className="truncate font-bold hover:text-gold-300">{entry.playerName}</Link> : <strong className="truncate">{entry.playerName}</strong>}
      <p className="mt-0.5 truncate text-xs text-white/40">{source} · {formatDate(entry.occurredDate)}{entry.attemptNumber != null ? ` · Versuch ${entry.attemptNumber}` : ""}</p></div>
    <strong className="whitespace-nowrap font-display text-lg tabular-nums text-gold-300">{time(entry.timeHundredths)}</strong>
  </li>;
}

function AllAttemptsRanking() {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState<RankedOfficialAttempt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(false);
    void getRankedOfficialAttempts(offset).then((page) => {
      if (!active) return;
      setEntries((current) => offset === 0 ? page.entries : [...current, ...page.entries]);
      setTotalCount(page.totalCount);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset, open]);

  return <section className="panel p-4 sm:p-6" aria-labelledby="all-attempts-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Offizielle Zeiten</p><h2 id="all-attempts-title" className="display-title mt-1 text-2xl">Alle Einzelversuche</h2></div>
      <Button type="button" variant="outline" aria-expanded={open} onClick={() => {
        if (open) { setOffset(0); setEntries([]); setTotalCount(0); }
        setOpen(!open);
      }}>{open ? "Rangliste schließen" : "Rangliste öffnen"}</Button>
    </div>
    {open && <div className="mt-5">
      {entries.length > 0 && <ol className="space-y-2">{entries.map((entry) => <AttemptRow key={`${entry.sourceType}:${entry.sourceId}`} entry={entry} />)}</ol>}
      {loading && <p className="mt-4 text-sm text-white/45" role="status">Versuche werden geladen…</p>}
      {error && <p className="mt-4 text-sm text-red-300" role="alert">Die Versuchs-Rangliste ist gerade nicht verfügbar.</p>}
      {!loading && !error && entries.length === 0 && <p className="text-sm text-white/45">Noch keine gültigen Versuche.</p>}
      {!loading && !error && entries.length < totalCount && <Button type="button" variant="outline" className="mt-5" onClick={() => setOffset(entries.length)}>Mehr anzeigen</Button>}
    </div>}
  </section>;
}

export function AdvancedHallOfFame() {
  return <div className="space-y-4"><SecretHallOfFame /><AllAttemptsRanking /></div>;
}
