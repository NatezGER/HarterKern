import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Swords } from "lucide-react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { formatDate } from "@/utils/format";
import type { RivalryHubV2, RivalryHubPairV2 } from "@/types/rivalryHub";

const pairKey = (pair: RivalryHubPairV2) => `${pair.playerAId}:${pair.playerBId}`;
const compareLink = (pair: RivalryHubPairV2) => `/compare?playerA=${pair.playerAId}&playerB=${pair.playerBId}`;
const pairRenderChunkSize = 20;

export function RivalryHubContent({ data }: { data: RivalryHubV2 }) {
  const [filter, setFilter] = useState("");
  const [sortMode, setSortMode] = useState<"score" | "length" | "takeovers">("score");
  const [renderProgress, setRenderProgress] = useState({ pairs: data.pairs, limit: pairRenderChunkSize });
  const query = filter.trim().toLocaleLowerCase("de");
  // Default order comes from SQL: score, length, takeovers, events, UUIDs.
  const filtered = useMemo(() => {
    const rows = data.pairs.filter(p => !query || p.playerADisplayName.toLocaleLowerCase("de").includes(query)
      || p.playerBDisplayName.toLocaleLowerCase("de").includes(query));
    if (sortMode === "score") return rows;
    return rows.sort((a, b) => (sortMode === "length" ? b.rivalryLength - a.rivalryLength : b.totalDirectTakeovers - a.totalDirectTakeovers)
      || b.rivalryScore - a.rivalryScore || pairKey(a).localeCompare(pairKey(b)));
  }, [data.pairs, query, sortMode]);
  const rivalries = filtered.filter(p => p.rivalryStatusAllTime);
  const duels = filtered.filter(p => p.duelOnly && p.totalDirectTakeovers > 0);
  // Prefer a formal rivalry in this scope. Only then fall back to known history.
  const spotlight = data.pairs.find(p => p.formalRivalryInScope)
    ?? data.pairs.find(p => p.historicalRivalry);
  const scopeLabel = data.season === "all-time" ? "All-Time" : `Saison ${data.season}`;
  const playerRanking = useMemo(() => {
    const players = new Map<string, { id: string; name: string; count: number }>();
    for (const p of data.pairs) if (p.rivalryLength > 0) {
      for (const [id, name] of [[p.playerAId, p.playerADisplayName], [p.playerBId, p.playerBDisplayName]]) {
        players.set(id, { id, name, count: (players.get(id)?.count ?? 0) + p.rivalryLength });
      }
    }
    return [...players.values()].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).slice(0, 10);
  }, [data.pairs]);
  const limit = renderProgress.pairs === data.pairs ? renderProgress.limit : pairRenderChunkSize;
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idleCallback: number | undefined;
    let nextLimit = pairRenderChunkSize;
    setRenderProgress({ pairs: data.pairs, limit: nextLimit });
    const schedule = () => {
      const append = () => {
        if (cancelled) return;
        nextLimit = Math.min(nextLimit + pairRenderChunkSize, data.pairs.length);
        setRenderProgress({ pairs: data.pairs, limit: nextLimit });
        if (nextLimit < data.pairs.length) schedule();
      };
      if ("requestIdleCallback" in window) idleCallback = window.requestIdleCallback(append, { timeout: 100 });
      else timer = setTimeout(append, 50);
    };
    if (data.pairs.length > nextLimit) schedule();
    return () => { cancelled = true; if (timer != null) clearTimeout(timer); if (idleCallback != null) window.cancelIdleCallback(idleCallback); };
  }, [data.pairs]);

  return <div className="min-w-0 space-y-10">
    <section aria-labelledby="rivalry-spotlight">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-200/70">{scopeLabel} · Head to Head</p>
      <h2 id="rivalry-spotlight" className="display-title my-4 text-3xl sm:text-4xl">Rivalry Spotlight</h2>
      {spotlight ? <PairCard pair={spotlight} spotlight scopeLabel={scopeLabel} />
        : <p className="panel p-6 text-sm text-white/45">Noch keine formale oder historische Rivalry mit Begegnung in diesem Scope. Direkte Duelle stehen weiter unten.</p>}
    </section>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Rivalry-Überblick">
      <Summary label="Rivalry-Events" value={data.summary.rivalryEvents} />
      <Summary label="Spieler mit Rivalry-Event im Scope" value={data.summary.playersWithRivalry} />
      <Summary label="Takeovers in vergleichbaren Events" value={data.summary.directTakeovers} />
      <Summary label="Takeovers/Event zur Rivalry" value={3} />
    </div>
    <section className="panel grid gap-4 p-5 sm:grid-cols-2">
      <details><summary className="cursor-pointer font-bold text-gold-200">Was bedeutet Intensity?</summary><p className="mt-3 text-sm leading-6 text-white/55">Misst direkte Führungswechsel pro gemeinsamem vergleichbarem Event. 100 % entsprechen im Schnitt 3 Wechseln pro Event. Werte über 100 % sind möglich. Ohne vergleichbare Events gibt es keinen Wert.</p></details>
      <details><summary className="cursor-pointer font-bold text-gold-200">Was bedeutet Rivalry Score?</summary><p className="mt-3 text-sm leading-6 text-white/55">Gewichtet Wechsel, gemeinsame Historie und Rivalry-Events. Mehr Takeovers erhöhen stark, gemeinsame Events geben History-Gewicht und mehrere Rivalry-Events erhöhen zusätzlich. Kein Einfluss auf Status oder Badges.</p></details>
    </section>
    <div className="flex flex-wrap gap-3">
      <label className="panel flex min-h-11 items-center gap-2 px-3 text-sm"><Search className="size-4 shrink-0" /><span className="sr-only">Nach Spieler filtern</span><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Spieler filtern" className="w-36 bg-transparent outline-none sm:w-44" /></label>
      <label className="panel flex min-h-11 items-center px-3 text-sm"><span className="sr-only">Paare sortieren</span><select value={sortMode} onChange={e => setSortMode(e.target.value as typeof sortMode)} className="max-w-full bg-transparent outline-none"><option className="bg-neutral-950" value="score">Rivalry Score</option><option className="bg-neutral-950" value="length">Meiste Rivalry-Events</option><option className="bg-neutral-950" value="takeovers">Meiste Takeovers</option></select></label>
    </div>
    <section aria-labelledby="formal-rivalries">
      <h2 id="formal-rivalries" className="display-title text-3xl">Echte Rivalries</h2>
      <p className="mt-2 text-sm text-white/45">Alle Rivalries mit Begegnung im Scope. Historischer Status wird getrennt von den aktuellen Werten gezeigt.</p>
      <PairGrid pairs={rivalries.slice(0, limit)} scopeLabel={scopeLabel} empty="Keine qualifizierte Rivalry für diesen Filter." />
    </section>
    <section aria-labelledby="direct-duels">
      <h2 id="direct-duels" className="display-title text-3xl">Duelle</h2>
      <p className="mt-2 text-sm text-white/45">Mindestens ein direkter Takeover, aber noch kein Rivalry-Event in der gesamten Historie.</p>
      <PairGrid pairs={duels.slice(0, limit)} scopeLabel={scopeLabel} empty="Keine direkten Duelle für diesen Filter." />
    </section>
    <details className="panel p-5">
      <summary className="cursor-pointer font-display text-xl font-bold">Meiste Rivalry-Events · Spieler</summary>
      {playerRanking.length ? <ol className="mt-4 grid gap-2 sm:grid-cols-2">{playerRanking.map(p => <li key={p.id}><Link className="flex min-w-0 justify-between gap-3 p-2 text-sm" to={`/player/${p.id}`}><span className="truncate">{p.name}</span><span className="shrink-0 text-gold-200">{p.count} Events</span></Link></li>)}</ol> : <p className="mt-4 text-sm text-white/45">Noch keine Rivalry-Events im Scope.</p>}
    </details>
  </div>;
}
function Summary({ label, value }: { label: string; value: number }) {
  return <article className="panel min-w-0 p-4"><Swords className="size-5 text-gold-300" /><p className="mt-3 font-display text-3xl font-black">{value}</p><p className="mt-1 text-xs text-white/45">{label}</p></article>;
}
function PairGrid({ pairs, scopeLabel, empty }: { pairs: RivalryHubPairV2[]; scopeLabel: string; empty: string }) {
  return pairs.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{pairs.map(p => <PairCard key={pairKey(p)} pair={p} scopeLabel={scopeLabel} />)}</div>
    : <p className="panel mt-5 p-6 text-sm text-white/40">{empty}</p>;
}
const PairCard = memo(function PairCard({ pair: p, spotlight = false, scopeLabel }: { pair: RivalryHubPairV2; spotlight?: boolean; scopeLabel: string }) {
  const date = (value: string | null) => value ? formatDate(value) : "—";
  return <article className={`panel min-w-0 overflow-hidden p-5 sm:p-7 ${spotlight ? "border-red-300/25 bg-gradient-to-br from-red-950/50 via-black/30 to-amber-950/20" : ""}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest ${p.rivalryStatusAllTime ? "border-red-300/25 text-red-100" : "border-white/15 text-white/60"}`}>{p.rivalryStatusAllTime ? "RIVALRY" : "DUELL"}</span>
      <span className="text-xs text-white/40">{scopeLabel}</span>
    </div>
    <div className="mt-5 flex min-w-0 items-center gap-3">
      <ProfileAvatar id={p.playerAId} name={p.playerADisplayName} url={p.playerAAvatarUrl} className="size-11 sm:size-14" />
      <h3 className="min-w-0 flex-1 break-words text-center font-display text-xl font-black sm:text-2xl">{p.playerADisplayName} ↔ {p.playerBDisplayName}</h3>
      <ProfileAvatar id={p.playerBId} name={p.playerBDisplayName} url={p.playerBAvatarUrl} className="size-11 sm:size-14" />
    </div>
    {p.historicalRivalry && <p className="mt-3 text-xs leading-5 text-amber-200/80">Historisch etablierte Rivalry · kein Rivalry-Event im gewählten Scope. Erstes All-Time: {date(p.firstRivalryEventDateAllTime)}.</p>}
    {p.duelOnly && <p className="mt-3 text-xs text-white/45">Noch kein Rivalry-Event</p>}
    <div className="mt-5 border-y border-white/10 py-4 text-center">
      <p className="text-xs uppercase tracking-widest text-gold-200">Rivalry Score</p>
      <p className={`mt-1 break-words font-display font-black tabular-nums text-gold-200 ${spotlight ? "text-6xl sm:text-7xl" : "text-4xl"}`}>{p.rivalryScore}</p>
    </div>
    <dl className="mt-5 grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
      <Value label="Intensity" value={p.intensityPercent == null ? "—" : `${p.intensityPercent} %`} />
      <Value label="Rivalry-Events" value={p.rivalryLength} />
      <Value label="Vergleichbare Events" value={p.comparableH2hEvents} />
      <Value label="Takeovers" value={p.totalDirectTakeovers} />
      <Value label="H2H A:B" value={`${p.h2hWinsA}:${p.h2hWinsB}`} />
      <Value label="Unentschieden" value={p.ties} />
    </dl>
    <details className="mt-5 text-xs text-white/45">
      <summary className="cursor-pointer">Historie &amp; Einordnung</summary>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Value label="Erstes Rivalry-Event im Scope" value={date(p.firstRivalryEventDateScope)} />
        <Value label="Letztes Rivalry-Event im Scope" value={date(p.lastRivalryEventDateScope)} />
        <Value label="Erstes Rivalry-Event All-Time" value={date(p.firstRivalryEventDateAllTime)} />
        <Value label="Rivalry-Events All-Time" value={p.rivalryLengthAllTime} />
        <Value label="Events mit Takeover" value={p.eventsWithTakeover} />
        <Value label="Takeovers in Rivalry-Events" value={p.rivalryDirectTakeovers} />
      </dl>
      {p.canonicalCommonEvents !== p.comparableH2hEvents && <p className="mt-3 leading-5">{p.canonicalCommonEvents} kanonische gemeinsame Events, davon {p.comparableH2hEvents} vergleichbar. Score, Intensity und H2H verwenden nur vergleichbare Events. Kanonische Takeovers insgesamt: {p.canonicalDirectTakeovers}.</p>}
    </details>
    <Link to={compareLink(p)} className="mt-4 inline-flex min-h-10 items-center text-xs font-bold uppercase tracking-wide text-gold-200">Im Vergleich öffnen →</Link>
  </article>;
});
function Value({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0"><dt className="text-xs text-white/45">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums">{value}</dd></div>;
}
