import type { RivalryPairSummary } from "@/types/statDashboard";

export function RivalryPairList({ pairs, live }: { pairs: RivalryPairSummary[]; live: boolean }) {
  if (!pairs.length) return null;
  return <section className="panel p-4 sm:p-6" data-rivalry-watch={live || undefined}>
    <h3 className="font-display text-xl font-black">{live ? "Rivalry Watch" : "Bestehende Rivalries"}</h3>
    {live && <p className="mt-1 text-xs text-white/45">Live-Beobachtung, noch kein dauerhaftes Rivalry-Event.</p>}
    <ol className="mt-4 space-y-2">{pairs.slice(0, 5).map((pair) => <li key={`${pair.playerLowId}:${pair.playerHighId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-sm">
      <strong>{pair.playerLowName} ↔ {pair.playerHighName}</strong>
      <span className="tabular-nums text-gold-200">{!live && `${pair.rivalryEvents} Rivalry-Events · `}{pair.directTakeovers} Takeovers</span>
      {live && pair.levelReached && <span className="w-full text-xs text-amber-200/70">Rivalry-Level erreicht · Entscheidung erst nach Eventende</span>}
    </li>)}</ol>
  </section>;
}
