import type { RivalryPairSummary } from "@/types/statDashboard";

export function RivalryPairList({ pairs, live }: { pairs: RivalryPairSummary[]; live: boolean }) {
  if (!pairs.length) return null;
  if (!live) {
    const rankings = [
      { key: "intensityPercent" as const, title: "Intensivste Rivalry", suffix: "%", direction: "desc" as const },
      { key: "spanDays" as const, title: "Längste Rivalry", suffix: " Tage", direction: "desc" as const },
      { key: "balancePercent" as const, title: "Engste Rivalry", suffix: "% Abweichung", direction: "asc" as const },
    ];
    return <section className="space-y-3" aria-label="Rivalry-Paarstatistiken">
      <article className="panel p-4 sm:p-6">
        <h3 className="font-display text-xl font-black">Bestehende Rivalries</h3>
        <ol className="mt-4 space-y-2">{pairs.slice(0, 5).map((pair) => <li key={`${pair.playerLowId}:${pair.playerHighId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-sm">
          <strong>{pair.playerLowName} ↔ {pair.playerHighName}</strong>
          <span className="tabular-nums text-gold-200">{pair.rivalryEvents} Rivalry-Events · {pair.directTakeovers} Takeovers</span>
          {pair.commonEvents != null && <span className="w-full text-xs text-white/40">{pair.commonEvents} gemeinsame Events</span>}
        </li>)}</ol>
      </article>
      <div className="grid gap-3 lg:grid-cols-3">{rankings.map((ranking) => {
        const ranked = pairs.filter((pair) => pair[ranking.key] != null).sort((left, right) => {
          const delta = (left[ranking.key] ?? 0) - (right[ranking.key] ?? 0);
          return ranking.direction === "asc" ? delta : -delta;
        }).slice(0, 5);
        return <article key={ranking.key} className="panel p-4 sm:p-5"><h3 className="font-display text-lg font-black">{ranking.title}</h3>
          {ranked.length ? <ol className="mt-3 space-y-2">{ranked.map((pair, index) => <li key={`${pair.playerLowId}:${pair.playerHighId}`} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-sm">
            <div className="flex items-center justify-between gap-2"><strong className="truncate">{index + 1}. {pair.playerLowName} ↔ {pair.playerHighName}</strong><span className="shrink-0 tabular-nums text-gold-200">{pair[ranking.key]?.toLocaleString("de-DE")}{ranking.suffix}</span></div>
            <p className="mt-1 text-[11px] text-white/40">{pair.commonEvents} gemeinsame Events · {pair.directTakeovers} Takeovers</p>
          </li>)}</ol> : <p className="mt-3 text-xs text-white/40">Noch kein qualifiziertes Paar.</p>}
        </article>;
      })}</div>
    </section>;
  }
  return <section className="panel p-4 sm:p-6" data-rivalry-watch={live || undefined}>
    <h3 className="font-display text-xl font-black">{live ? "Rivalry Watch" : "Bestehende Rivalries"}</h3>
    {live && <p className="mt-1 text-xs text-white/45">Live-Beobachtung, noch kein dauerhaftes Rivalry-Event.</p>}
    <ol className="mt-4 space-y-2">{pairs.slice(0, 5).map((pair) => <li key={`${pair.playerLowId}:${pair.playerHighId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-sm">
      <strong>{pair.playerLowName} ↔ {pair.playerHighName}</strong>
      <span className="tabular-nums text-gold-200">{!live && `${pair.rivalryEvents} Rivalry-Events · `}{pair.directTakeovers} Takeovers</span>
      {!live && pair.commonEvents != null && <span className="w-full text-xs text-white/40">
        {pair.commonEvents} gemeinsame Events
        {pair.intensityPercent != null ? ` · Intensität ${pair.intensityPercent.toLocaleString("de-DE")} %` : ""}
        {pair.spanDays != null ? ` · ${pair.spanDays.toLocaleString("de-DE")} Tage` : ""}
        {pair.balancePercent != null ? ` · Bilanzabweichung ${pair.balancePercent.toLocaleString("de-DE")} %` : ""}
      </span>}
      {live && pair.levelReached && <span className="w-full text-xs text-amber-200/70">Rivalry-Level erreicht · Entscheidung erst nach Eventende</span>}
    </li>)}</ol>
  </section>;
}
