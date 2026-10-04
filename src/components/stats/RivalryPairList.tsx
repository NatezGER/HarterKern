import type { RivalryPairSummary } from "@/types/statDashboard";
import { formatDate } from "@/utils/format";

const pairKey = (pair: RivalryPairSummary) => `${pair.playerLowId}:${pair.playerHighId}`;
const pairName = (pair: RivalryPairSummary) => `${pair.playerLowName} ↔ ${pair.playerHighName}`;
const deterministic = (left: RivalryPairSummary, right: RivalryPairSummary) => pairKey(left).localeCompare(pairKey(right));
const allTakeovers = (pair: RivalryPairSummary) => pair.allDirectTakeovers ?? pair.directTakeovers;
const rivalryTakeovers = (pair: RivalryPairSummary) => pair.rivalryDirectTakeovers ?? pair.directTakeovers;

export function RivalryPairList({ pairs, live }: { pairs: RivalryPairSummary[]; live: boolean }) {
  if (!pairs.length) return null;
  if (live) return <section className="panel p-4 sm:p-6" data-rivalry-watch>
    <h3 className="font-display text-xl font-black">Rivalry Watch</h3>
    <p className="mt-1 text-xs text-white/45">Live-Beobachtung mit derselben paarweisen Takeover-Logik wie die Historie.</p>
    <PairRows pairs={[...pairs].sort((a, b) => allTakeovers(b) - allTakeovers(a) || deterministic(a, b)).slice(0, 5)} value={(pair) => `${allTakeovers(pair)} Takeovers`} />
  </section>;

  const rivalries = pairs.filter(({ rivalryEvents }) => rivalryEvents > 0);
  const longest = [...rivalries].sort((a, b) => (b.spanDays ?? 0) - (a.spanDays ?? 0) || b.rivalryEvents - a.rivalryEvents || deterministic(a, b)).slice(0, 5);
  const strongest = [...rivalries].sort((a, b) => rivalryTakeovers(b) - rivalryTakeovers(a) || b.rivalryEvents - a.rivalryEvents || deterministic(a, b)).slice(0, 5);
  const direct = [...pairs].filter((pair) => allTakeovers(pair) > 0)
    .sort((a, b) => allTakeovers(b) - allTakeovers(a) || deterministic(a, b)).slice(0, 5);

  return <section className="space-y-3" aria-label="Rivalry-Paarstatistiken">
    <div className="grid gap-3 lg:grid-cols-2">
      <RankingCard title="Längste Rivalries" pairs={longest} value={(pair) => `${pair.spanDays ?? 0} Tage`} detail={(pair) => `${pair.firstRivalryDate ? formatDate(pair.firstRivalryDate) : "—"} bis ${pair.lastRivalryDate ? formatDate(pair.lastRivalryDate) : "—"} · ${pair.rivalryEvents} Rivalry-Events`} />
      <RankingCard title="Stärkste Rivalries" pairs={strongest} value={(pair) => `${rivalryTakeovers(pair)} Takeovers`} detail={(pair) => `${pair.rivalryEvents} Rivalry-Events`} />
    </div>
    <RankingCard title="Meiste direkte Führungswechsel" pairs={direct} value={(pair) => `${allTakeovers(pair)} Takeovers`} detail={(pair) => `${pair.commonEvents ?? 0} gemeinsame Events · einschließlich Duellen unter der Rivalry-Schwelle`} />
  </section>;
}

function RankingCard({ title, pairs, value, detail }: { title: string; pairs: RivalryPairSummary[]; value: (pair: RivalryPairSummary) => string; detail: (pair: RivalryPairSummary) => string }) {
  return <article className="panel p-4 sm:p-5"><h3 className="font-display text-lg font-black">{title}</h3>
    {pairs.length ? <PairRows pairs={pairs} value={value} detail={detail} /> : <p className="mt-3 text-xs text-white/40">Noch kein qualifiziertes Paar.</p>}
  </article>;
}

function PairRows({ pairs, value, detail }: { pairs: RivalryPairSummary[]; value: (pair: RivalryPairSummary) => string; detail?: (pair: RivalryPairSummary) => string }) {
  return <ol className="mt-3 space-y-2">{pairs.map((pair, index) => <li key={pairKey(pair)} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-sm">
    <div className="flex items-center justify-between gap-2"><strong className="truncate">{index + 1}. {pairName(pair)}</strong><span className="shrink-0 tabular-nums text-gold-200">{value(pair)}</span></div>
    {detail && <p className="mt-1 text-[11px] text-white/40">{detail(pair)}</p>}
  </li>)}</ol>;
}
