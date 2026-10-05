import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Swords } from "lucide-react";
import { formatDate } from "@/utils/format";
import type { RivalryHubData, RivalryPairSummary } from "@/types/statDashboard";

const allTakeovers = (pair: RivalryPairSummary) => pair.allDirectTakeovers ?? pair.directTakeovers;
const rivalryTakeovers = (pair: RivalryPairSummary) => pair.rivalryDirectTakeovers ?? pair.directTakeovers;
const pairKey = (pair: RivalryPairSummary) => `${pair.playerLowId}:${pair.playerHighId}`;
const pairName = (pair: RivalryPairSummary) => `${pair.playerLowName} ↔ ${pair.playerHighName}`;
const pairRenderChunkSize = 20;

export function RivalryHubContent({ data }: { data: RivalryHubData }) {
  const [filter, setFilter] = useState("");
  const [sortMode, setSortMode] = useState<"events" | "takeovers" | "duration">("events");
  const [renderProgress, setRenderProgress] = useState({
    pairs: data.pairs,
    limit: pairRenderChunkSize,
  });
  const query = filter.trim().toLocaleLowerCase("de");
  const filtered = useMemo(() => data.pairs.filter((pair) => !query
    || pair.playerLowName.toLocaleLowerCase("de").includes(query)
    || pair.playerHighName.toLocaleLowerCase("de").includes(query)), [data.pairs, query]);
  const rivalries = useMemo(() => filtered.filter(({ rivalryEvents }) => rivalryEvents > 0).sort((a, b) => sortMode === "takeovers"
    ? rivalryTakeovers(b) - rivalryTakeovers(a) || b.rivalryEvents - a.rivalryEvents
    : sortMode === "duration" ? (b.spanDays ?? 0) - (a.spanDays ?? 0) || b.rivalryEvents - a.rivalryEvents
      : b.rivalryEvents - a.rivalryEvents || rivalryTakeovers(b) - rivalryTakeovers(a)), [filtered, sortMode]);
  const directDuels = useMemo(() => filtered.filter((pair) => allTakeovers(pair) > 0)
    .sort((a, b) => allTakeovers(b) - allTakeovers(a) || b.rivalryEvents - a.rivalryEvents), [filtered]);
  const strongest = useMemo(() => [...data.pairs].filter(({ rivalryEvents }) => rivalryEvents > 0)
    .sort((a, b) => rivalryTakeovers(b) - rivalryTakeovers(a) || b.rivalryEvents - a.rivalryEvents).slice(0, 5), [data.pairs]);
  const longest = useMemo(() => [...data.pairs].filter(({ rivalryEvents }) => rivalryEvents > 0)
    .sort((a, b) => (b.spanDays ?? 0) - (a.spanDays ?? 0) || b.rivalryEvents - a.rivalryEvents).slice(0, 5), [data.pairs]);
  const playerRanking = useMemo(() => [...data.pairs].filter(({ rivalryEvents }) => rivalryEvents > 0).reduce((result, pair) => {
    result.set(pair.playerLowId, { id: pair.playerLowId, name: pair.playerLowName, count: (result.get(pair.playerLowId)?.count ?? 0) + pair.rivalryEvents });
    result.set(pair.playerHighId, { id: pair.playerHighId, name: pair.playerHighName, count: (result.get(pair.playerHighId)?.count ?? 0) + pair.rivalryEvents });
    return result;
  }, new Map<string, { id: string; name: string; count: number }>()), [data.pairs]);
  const visiblePairLimit = renderProgress.pairs === data.pairs
    ? renderProgress.limit
    : pairRenderChunkSize;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idleCallback: number | undefined;
    let limit = pairRenderChunkSize;
    setRenderProgress({ pairs: data.pairs, limit });
    const appendChunk = () => {
      const append = () => {
        if (cancelled) return;
        limit = Math.min(limit + pairRenderChunkSize, data.pairs.length);
        setRenderProgress({ pairs: data.pairs, limit });
        if (limit < data.pairs.length) appendChunk();
      };
      if ("requestIdleCallback" in window) {
        idleCallback = window.requestIdleCallback(append, { timeout: 100 });
      } else {
        timer = setTimeout(append, 50);
      }
    };
    if (data.pairs.length > limit) appendChunk();
    return () => {
      cancelled = true;
      if (timer != null) clearTimeout(timer);
      if (idleCallback != null) window.cancelIdleCallback(idleCallback);
    };
  }, [data.pairs]);

  return <div className="space-y-10">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Rivalry-Überblick">
      <Summary label="Rivalry-Events" value={data.summary.rivalryEvents} />
      <Summary label="Rivalry-Spieler" value={data.summary.playersWithRivalry} />
      <Summary label="Direkte Takeovers" value={data.summary.directTakeovers} />
      <Summary label="Rivalry-Schwelle" value="3" suffix="Takeovers/Event" />
    </section>

    <section className="grid gap-4 xl:grid-cols-3">
      <Ranking title="Meiste Rivalry-Events" rows={[...playerRanking.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de")).slice(0, 10).map((player) => ({ key: player.id, label: player.name, value: `${player.count} Events`, to: `/player/${player.id}` }))} />
      <Ranking title="Stärkste Rivalries" rows={strongest.map((pair) => ({ key: pairKey(pair), label: pairName(pair), value: `${rivalryTakeovers(pair)} Takeovers`, to: compareLink(pair) }))} />
      <Ranking title="Längste Rivalries" rows={longest.map((pair) => ({ key: pairKey(pair), label: pairName(pair), value: `${pair.spanDays ?? 0} Tage`, to: compareLink(pair) }))} />
    </section>

    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="display-title text-3xl">Alle Rivalries</h2><p className="mt-2 max-w-2xl text-sm text-white/45">Alle Paare mit mindestens einem Event ab drei direkten Führungswechseln.</p></div>
        <div className="flex flex-wrap gap-2"><label className="panel flex min-h-11 items-center gap-2 px-3 text-sm text-white/55"><Search className="size-4" /><span className="sr-only">Nach Spieler filtern</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Spieler filtern" className="w-36 bg-transparent text-white outline-none placeholder:text-white/25 sm:w-44" /></label><label className="panel flex min-h-11 items-center px-3 text-sm text-white/55"><span className="sr-only">Rivalries sortieren</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)} className="bg-transparent outline-none"><option className="bg-neutral-950" value="events">Meiste Events</option><option className="bg-neutral-950" value="takeovers">Meiste Takeovers</option><option className="bg-neutral-950" value="duration">Längste Dauer</option></select></label></div>
      </div>
      <PairGrid pairs={rivalries.slice(0, visiblePairLimit)} empty="Keine qualifizierte Rivalry für diesen Filter." />
    </section>

    <section>
      <h2 className="display-title text-3xl">Direkte Duelle</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">Ein direktes Duell beginnt schon mit einem Takeover. Erst drei Takeovers desselben Paars in einem Event machen daraus ein Rivalry-Event.</p>
      <PairGrid pairs={directDuels.slice(0, visiblePairLimit)} empty="Keine direkten Duelle für diesen Filter." direct />
    </section>
  </div>;
}

function compareLink(pair: RivalryPairSummary) {
  return `/compare?playerA=${pair.playerLowId}&playerB=${pair.playerHighId}`;
}

function Summary({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return <article className="panel p-4 sm:p-5"><Swords className="size-5 text-gold-300" /><p className="mt-4 font-display text-3xl font-black">{value}</p><p className="mt-1 text-xs text-white/40">{label}{suffix ? ` · ${suffix}` : ""}</p></article>;
}

function Ranking({ title, rows }: { title: string; rows: { key: string; label: string; value: string; to: string }[] }) {
  return <article className="panel p-4 sm:p-5"><h3 className="font-display text-xl font-black">{title}</h3>{rows.length ? <ol className="mt-4 space-y-2">{rows.map((row, index) => <li key={row.key}><Link to={row.to} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm transition hover:border-gold-300/20"><strong className="truncate">{index + 1}. {row.label}</strong><span className="shrink-0 text-gold-200">{row.value}</span></Link></li>)}</ol> : <p className="mt-4 text-sm text-white/35">Noch keine qualifizierten Daten.</p>}</article>;
}

function PairGrid({ pairs, empty, direct = false }: { pairs: RivalryPairSummary[]; empty: string; direct?: boolean }) {
  if (!pairs.length) return <div className="panel mt-5 p-8 text-center text-sm text-white/35">{empty}</div>;
  return <div className="mt-5 grid gap-3 lg:grid-cols-2">{pairs.map((pair) => <PairCard key={pairKey(pair)} pair={pair} direct={direct} />)}</div>;
}

const PairCard = memo(function PairCard({ pair, direct }: { pair: RivalryPairSummary; direct: boolean }) {
  return <article className="panel p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-display text-lg font-black">{pairName(pair)}</h3><p className="mt-1 text-xs text-white/35">{pair.commonEvents ?? 0} gemeinsame Events</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${pair.rivalryEvents > 0 ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-white/10 bg-white/[0.04] text-white/45"}`}>{pair.rivalryEvents > 0 ? "Rivalry" : "Direct Duel"}</span></div>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-white/35">Rivalry-Events</dt><dd className="mt-1 font-bold">{pair.rivalryEvents}</dd></div><div><dt className="text-xs text-white/35">{direct ? "Alle Takeovers" : "Rivalry-Takeovers"}</dt><dd className="mt-1 font-bold">{direct ? allTakeovers(pair) : rivalryTakeovers(pair)}</dd></div><div><dt className="text-xs text-white/35">Erste Rivalry</dt><dd className="mt-1">{pair.firstRivalryDate ? formatDate(pair.firstRivalryDate) : "—"}</dd></div><div><dt className="text-xs text-white/35">Letzte Rivalry</dt><dd className="mt-1">{pair.lastRivalryDate ? formatDate(pair.lastRivalryDate) : "—"}</dd></div></dl>
    <Link to={compareLink(pair)} className="mt-4 inline-flex min-h-10 items-center text-xs font-bold uppercase tracking-wide text-gold-200 hover:text-gold-100">Im Vergleich öffnen →</Link>
  </article>;
});
