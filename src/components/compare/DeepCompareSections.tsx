import { BarChart3, LoaderCircle } from "lucide-react";
import { CompareAttemptNumberChart } from "@/components/compare/CompareAttemptNumberChart";
import { CompareMetricRow } from "@/components/compare/CompareMetricRow";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProgressionTimeline, type TimelinePoint } from "@/components/progression/ProgressionTimeline";
import {
  calculateCompareLeadSummary,
  calculateProgressionCrossovers,
} from "@/lib/playerCompareDeep";
import type { CompareDirection } from "@/lib/playerCompare";
import type {
  PlayerProfileCore,
  PlayerSeasonProfile,
  PlayerTimePerformance,
  ProgressionPoint,
} from "@/types/historyProfiles";
import type {
  ComparableValue,
  PlayerCompareProgressionPair,
  PlayerCompareSequencePair,
} from "@/types/playerCompare";
import type { Player } from "@/types";
import { formatTime } from "@/utils/format";

type ActiveStatistics = PlayerProfileCore | PlayerSeasonProfile | null;
type SectionState<T> = { data: T | null; loading: boolean; error: string };

interface Metric {
  label: string;
  direction: CompareDirection | null;
  left: { raw: number | null; display: string };
  right: { raw: number | null; display: string };
}

export function CompareProgressionSection({
  playerA,
  playerB,
  state,
}: {
  playerA: Player;
  playerB: Player;
  state: SectionState<PlayerCompareProgressionPair>;
}) {
  if (state.loading) return <LoadingSection label="PB-Entwicklung wird geladen" />;
  if (state.error || !state.data) return <ErrorSection title="PB-Entwicklung" error={state.error} />;
  const pointsA = progressionPoints(state.data.playerA ?? [], playerA);
  const pointsB = progressionPoints(state.data.playerB ?? [], playerB);
  const crossovers = calculateProgressionCrossovers(state.data.playerA ?? [], state.data.playerB ?? []);
  const primaryCrossovers = crossovers.filter(({ player }) => player === "a").map(({ pointId }) => pointId);
  const comparisonCrossovers = crossovers.filter(({ player }) => player === "b").map(({ pointId }) => pointId);
  return (
    <section className="panel p-5 sm:p-7">
      <SectionHeading eyebrow="Gemeinsame chronologische Zeitachse" title="PB-Entwicklung" />
      {(state.data.playerAError || state.data.playerBError) && (
        <p className="mb-4 text-xs text-amber-100/60">Eine der beiden Progressionen ist vorübergehend nicht verfügbar; die vorhandene Serie bleibt sichtbar.</p>
      )}
      <ProgressionTimeline
        points={pointsA}
        comparisonPoints={pointsB}
        primaryLabel={playerA.name}
        comparisonLabel={playerB.name}
        comparisonInitiallyVisible
        compact
        showHistory={false}
        primaryCrossoverIds={primaryCrossovers}
        comparisonCrossoverIds={comparisonCrossovers}
        emptyLabel="Für beide Spieler ist noch keine PB-Entwicklung vorhanden."
      />
    </section>
  );
}

export function CompareAttemptNumbersSection({
  playerA,
  playerB,
  state,
}: {
  playerA: Player;
  playerB: Player;
  state: SectionState<PlayerCompareSequencePair | null>;
}) {
  return (
    <section className="panel p-5 sm:p-7">
      <SectionHeading eyebrow="Gültiger Durchschnitt je Eventslot" title="Nach Versuchsnummer" />
      {state.loading ? <InlineLoading label="Versuchsnummern werden geladen" />
        : state.error || !state.data ? <InlineError error={state.error} />
          : <CompareAttemptNumberChart
            playerAName={playerA.name}
            playerBName={playerB.name}
            playerA={state.data.playerA.attemptNumbers}
            playerB={state.data.playerB.attemptNumbers}
          />}
    </section>
  );
}

export function CompareConsistencySection({
  sequence,
  performanceA,
  performanceB,
}: {
  sequence: SectionState<PlayerCompareSequencePair | null>;
  performanceA: PlayerTimePerformance | null;
  performanceB: PlayerTimePerformance | null;
}) {
  const metrics: Metric[] = [
    metric("Längste 2,xx-Serie", sequence.data?.playerA.longestSub3Streak ?? null, sequence.data?.playerB.longestSub3Streak ?? null, "higher", countValue),
    metric("Längste Serie ohne DNF", sequence.data?.playerA.longestNoDnfStreak ?? null, sequence.data?.playerB.longestNoDnfStreak ?? null, "higher", countValue),
    metric("Konstanz / Streuung", performanceA?.standardDeviationHundredths ?? null, performanceB?.standardDeviationHundredths ?? null, "lower", durationValue),
  ];
  return <MetricSection eyebrow="Rhythmus & Verlässlichkeit" title="Konstanz & Serien" metrics={metrics} note={sequence.loading ? "Serien werden geladen …" : sequence.error} />;
}

export function CompareEventPerformanceSection({
  statsA,
  statsB,
  sequence,
}: {
  statsA: ActiveStatistics;
  statsB: ActiveStatistics;
  sequence: SectionState<PlayerCompareSequencePair | null>;
}) {
  const metrics: Metric[] = [
    metric("Event-Führungszeit gesamt", statsA?.eventLeadSeconds ?? null, statsB?.eventLeadSeconds ?? null, "higher", leadValue),
    metric("Eventbestzeiten gebrochen", statsA?.eventBestBreaks ?? null, statsB?.eventBestBreaks ?? null, "higher", countValue),
    metric("Schnellster erster Versuch", sequence.data?.playerA.fastestFirstAttemptHundredths ?? null, sequence.data?.playerB.fastestFirstAttemptHundredths ?? null, "lower", timeValue),
  ];
  return <MetricSection eyebrow="Gegen das gesamte Eventfeld" title="Event- & Leistungswerte" metrics={metrics} note={sequence.loading ? "Erste Versuche werden geladen …" : sequence.error} />;
}

export function CompareSummarySection({
  playerA,
  playerB,
  values,
}: {
  playerA: Player;
  playerB: Player;
  values: ComparableValue[];
}) {
  const summary = calculateCompareLeadSummary(values);
  return (
    <section className="panel flex flex-col items-center gap-3 p-6 text-center sm:p-8">
      <BarChart3 className="context-accent-text size-6" />
      <p className="font-display text-xl font-black uppercase sm:text-2xl">{playerA.name} liegt bei {summary.playerALeads} von {summary.compared} vergleichbaren Werten vorn.</p>
      <p className="text-sm text-white/40">{playerB.name} bei {summary.playerBLeads} · {summary.ties} {summary.ties === 1 ? "Gleichstand" : "Gleichstände"}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">Experimentelle Übersicht · keine Gewichtung und kein Gesamtergebnis</p>
    </section>
  );
}

function MetricSection({ eyebrow, title, metrics, note }: { eyebrow: string; title: string; metrics: Metric[]; note?: string }) {
  return (
    <section className="panel overflow-hidden">
      <div className="p-5 pb-3 sm:p-7 sm:pb-4"><SectionHeading eyebrow={eyebrow} title={title} />{note && <p className="text-xs text-amber-100/60">{note}</p>}</div>
      {metrics.map((item) => <CompareMetricRow key={item.label} {...item} />)}
    </section>
  );
}

function LoadingSection({ label }: { label: string }) {
  return <section className="panel grid min-h-52 place-items-center"><InlineLoading label={label} /></section>;
}

function ErrorSection({ title, error }: { title: string; error: string }) {
  return <section className="panel p-5 sm:p-7"><SectionHeading eyebrow="Optionaler Vergleich" title={title} /><InlineError error={error} /></section>;
}

function InlineLoading({ label }: { label: string }) {
  return <div className="grid min-h-28 place-items-center text-center"><div><LoaderCircle className="context-accent-text mx-auto size-5 animate-spin" /><p className="mt-3 text-sm text-white/40">{label}</p></div></div>;
}

function InlineError({ error }: { error: string }) {
  return <p className="grid min-h-28 place-items-center text-center text-sm text-amber-100/65">{error || "Dieser Bereich ist vorübergehend nicht verfügbar."}</p>;
}

function progressionPoints(points: ProgressionPoint[], player: Player): TimelinePoint[] {
  return points.map((point) => ({ ...point, playerId: player.id, playerName: player.name, avatarUrl: player.avatarUrl, hasExactTime: point.sourceType === "attempt" }));
}

function metric(label: string, left: number | null, right: number | null, direction: CompareDirection | null, format: (value: number | null) => { raw: number | null; display: string }): Metric {
  return { label, direction, left: format(left), right: format(right) };
}

function countValue(value: number | null) { return { raw: value, display: value == null ? "—" : value.toLocaleString("de-DE") }; }
function timeValue(value: number | null) { return { raw: value, display: value == null ? "—" : formatTime(value / 100) }; }
function durationValue(value: number | null) { return { raw: value, display: value == null ? "—" : `${(value / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s` }; }
function leadValue(value: number | null) { return { raw: value, display: value == null ? "—" : formatLead(value) }; }

function formatLead(seconds: number) {
  if (seconds < 60) return `${seconds} Sek.`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} Std. ${minutes} Min.` : `${minutes} Min.`;
}
