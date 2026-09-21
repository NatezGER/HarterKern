import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMetricValue } from "@/utils/statMetricFormat";
import { statisticMetricByKey } from "@/constants/statMetricRegistry";
import { calculateCompareBlockScore, createCompareBlocks } from "@/lib/playerCompareBlocks";
import type { Player } from "@/types";
import type { PlayerCompareMetricBundle } from "@/types/playerCompare";

export function CompareThemeBlocks({ playerA, playerB, bundle }: { playerA: Player; playerB: Player; bundle: PlayerCompareMetricBundle }) {
  const blocks = useMemo(() => createCompareBlocks(bundle, playerA.id, playerB.id), [bundle, playerA.id, playerB.id]);
  const score = calculateCompareBlockScore(blocks);
  return <section className="space-y-3" aria-labelledby="compare-block-score">
    <div className="panel p-5 text-center sm:p-7">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-300">Gesamt-Blockscore</p>
      <h2 id="compare-block-score" className="mt-2 font-display text-3xl font-black tabular-nums">{score.playerA.toLocaleString("de-DE")} : {score.playerB.toLocaleString("de-DE")}</h2>
      <p className="mt-2 text-xs text-white/45">{score.comparableBlocks} von {score.totalBlocks} Blöcken vergleichbar · ein Block zählt maximal einen Punkt</p>
    </div>
    {blocks.map((block, index) => <CompareBlockDisclosure key={block.key} block={block} playerA={playerA} playerB={playerB} defaultOpen={index < 2} />)}
  </section>;
}

function CompareBlockDisclosure({ block, playerA, playerB, defaultOpen }: { block: ReturnType<typeof createCompareBlocks>[number]; playerA: Player; playerB: Player; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const winner = block.winner === "a" ? playerA.name : block.winner === "b" ? playerB.name : block.winner === "tie" ? "Unentschieden" : "Nicht wertbar";
  return <article className="panel overflow-hidden">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
      <span className="min-w-0 flex-1"><strong className="font-display text-lg font-black">{block.title}</strong><span className="mt-1 block text-xs text-white/45">{winner} · {block.playerAPoints.toLocaleString("de-DE")} : {block.playerBPoints.toLocaleString("de-DE")}</span></span>
      <ChevronDown className={`size-5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="border-t border-white/[0.06]">
      {block.metrics.map((metric) => {
        const definition = statisticMetricByKey.get(metric.key);
        const format = definition?.format ?? "count";
        return <div key={metric.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-b-0 sm:px-5">
          <div className="min-w-0"><p className="text-sm font-bold">{metric.label}</p><p className="text-[11px] text-white/35">{metric.scoreable ? metric.comparable ? "wertbar" : "nicht wertbar" : "Kontext"}{metric.left?.detail ? ` · ${metric.left.detail}` : ""}</p></div>
          <span className={`tabular-nums ${metric.winner === "a" ? "text-gold-200" : "text-white/65"}`}>{formatMetricValue(metric.left?.value ?? null, format)}</span>
          <span className={`tabular-nums ${metric.winner === "b" ? "text-gold-200" : "text-white/65"}`}>{formatMetricValue(metric.right?.value ?? null, format)}</span>
        </div>;
      })}
    </div>}
  </article>;
}
