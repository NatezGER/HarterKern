import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { CompareMetricRow } from "@/components/compare/CompareMetricRow";
import { SectionHeading } from "@/components/common/SectionHeading";
import { statisticMetricByKey } from "@/constants/statMetricRegistry";
import { calculateCompareBlockScore, createCompareBlocks } from "@/lib/playerCompareBlocks";
import type { Player } from "@/types";
import type { CompareBlockResult, PlayerCompareMetricBundle } from "@/types/playerCompare";
import { formatMetricValue } from "@/utils/statMetricFormat";

export function CompareThemeBlocks({ playerA, playerB, bundle }: {
  playerA: Player;
  playerB: Player;
  bundle: PlayerCompareMetricBundle;
}) {
  const blocks = useMemo(
    () => createCompareBlocks(bundle, playerA.id, playerB.id),
    [bundle, playerA.id, playerB.id],
  );
  const score = calculateCompareBlockScore(blocks);
  return <section className="space-y-4" aria-labelledby="integrated-statistics-title">
    <div className="panel p-5 pb-3 sm:p-7 sm:pb-4">
      <SectionHeading eyebrow="Direkter Wertevergleich" title="Hauptstatistiken" />
      <p id="integrated-statistics-title" className="text-sm leading-6 text-white/45">Alle Werte sind einmalig nach Themen geordnet. Punkte gibt es nur, wenn beide Spieler die Mindeststichprobe erfüllen.</p>
    </div>
    {blocks.map((block) => <CompareBlock key={block.key} block={block} playerA={playerA} playerB={playerB} />)}
    <section className="panel flex flex-col items-center gap-3 p-6 text-center sm:p-8" data-compare-final-score>
      <BarChart3 className="context-accent-text size-6" />
      <p className="context-accent-text text-[10px] font-black uppercase tracking-[0.2em]">Gesamtwertung</p>
      <h2 className="display-title text-2xl sm:text-3xl">Wer liegt vorne?</h2>
      <div className="grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-4">
        <ScoreValue label={playerA.name} value={score.playerA} />
        <ScoreValue label="Wertbare Blöcke" value={score.comparableBlocks} />
        <ScoreValue label={playerB.name} value={score.playerB} />
      </div>
      <div className="w-full max-w-2xl space-y-1 text-left text-xs text-white/55">
        {blocks.filter(({ comparable }) => comparable).map((block) => <p key={block.key} className="flex justify-between gap-3"><span>{block.title}</span><strong>{blockWinner(block, playerA, playerB)}</strong></p>)}
      </div>
      <p className="text-xs text-white/35">Ein gewonnener Block zählt einen Punkt, ein Block-Gleichstand je 0,5. Blöcke ohne wertbare Metrics bleiben außen vor.</p>
    </section>
  </section>;
}

function CompareBlock({ block, playerA, playerB }: {
  block: CompareBlockResult;
  playerA: Player;
  playerB: Player;
}) {
  const visibleMetrics = block.metrics.filter(({ left, right }) => left != null || right != null);
  if (visibleMetrics.length === 0) return null;
  return <section className="panel overflow-hidden" data-compare-block={block.key}>
    <div className="p-5 pb-3 sm:p-7 sm:pb-4">
      <SectionHeading eyebrow="Themenblock" title={block.title} />
    </div>
    {visibleMetrics.map((metric) => {
      const definition = statisticMetricByKey.get(metric.key);
      const format = definition?.format ?? "count";
      const direction = metric.comparable
        ? definition?.direction === "asc" ? "lower" : "higher"
        : null;
      return <div key={metric.key}>
        <CompareMetricRow
          label={metric.label}
          direction={direction}
          left={{ raw: metric.left?.value ?? null, display: formatMetricValue(metric.left?.value ?? null, format) }}
          right={{ raw: metric.right?.value ?? null, display: formatMetricValue(metric.right?.value ?? null, format) }}
        />
        {(metric.left?.total != null || metric.right?.total != null || !metric.scoreable) && <p className="border-t border-white/[0.03] px-4 py-1.5 text-center text-[10px] text-white/35">
          {!metric.scoreable ? "Kontext · ohne Punkte" : !metric.comparable ? "Noch nicht beidseitig wertbar" : "Wertbar"}
          {metric.left?.total != null || metric.right?.total != null ? ` · Stichprobe ${metric.left?.count ?? metric.left?.total ?? 0} / ${metric.left?.total ?? "—"} vs. ${metric.right?.count ?? metric.right?.total ?? 0} / ${metric.right?.total ?? "—"}` : ""}
        </p>}
      </div>;
    })}
    <div className="flex items-center justify-between border-t border-gold-300/15 bg-gold-300/[0.04] px-5 py-3 text-sm">
      <span className="font-bold">{block.title} · {block.playerAPoints.toLocaleString("de-DE")} : {block.playerBPoints.toLocaleString("de-DE")}</span>
      <span className="text-xs text-gold-200/80">{blockWinner(block, playerA, playerB)}</span>
    </div>
  </section>;
}

function blockWinner(block: CompareBlockResult, playerA: Player, playerB: Player) {
  if (!block.comparable) return "Nicht wertbar";
  if (block.winner === "a") return playerA.name;
  if (block.winner === "b") return playerB.name;
  return "Unentschieden";
}

function ScoreValue({ label, value }: { label: string; value: number }) {
  return <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4"><strong className="font-display text-3xl font-black tabular-nums sm:text-4xl">{value.toLocaleString("de-DE")}</strong><p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-white/40 sm:text-[10px]">{label}</p></div>;
}
