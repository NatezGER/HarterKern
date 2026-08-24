import { BarChart3, ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { CompareMetricRow } from "@/components/compare/CompareMetricRow";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ProgressionTimeline, type TimelinePoint } from "@/components/progression/ProgressionTimeline";
import { Button } from "@/components/ui/button";
import {
  calculateCompareLeadSummary,
  compareBadgeCollections,
  visibleAttemptNumbers,
} from "@/lib/playerCompareDeep";
import type { CompareDirection } from "@/lib/playerCompare";
import type {
  PlayerProfileCore,
  PlayerSeasonProfile,
  ProgressionPoint,
} from "@/types/historyProfiles";
import type {
  ComparableValue,
  PlayerDeepCompareData,
  PlayerDeepComparePair,
} from "@/types/playerCompare";
import type { Player } from "@/types";
import { formatTime } from "@/utils/format";

type ActiveStatistics = PlayerProfileCore | PlayerSeasonProfile | null;

interface Metric {
  label: string;
  direction: CompareDirection | null;
  left: { raw: number | null; display: string };
  right: { raw: number | null; display: string };
}

export function DeepCompareSections({
  playerA,
  playerB,
  data,
  loading,
  error,
  statsA,
  statsB,
  isAllTime,
}: {
  playerA: Player;
  playerB: Player;
  data: PlayerDeepComparePair | null;
  loading: boolean;
  error: string;
  statsA: ActiveStatistics;
  statsB: ActiveStatistics;
  isAllTime: boolean;
}) {
  if (loading) {
    return <section className="panel grid min-h-48 place-items-center"><div className="text-center"><LoaderCircle className="context-accent-text mx-auto size-6 animate-spin" /><p className="mt-3 text-sm text-white/40">Deep Stats werden gebündelt berechnet …</p></div></section>;
  }
  if (error || !data?.playerA || !data.playerB) {
    return <section className="panel p-5 text-center text-sm text-amber-100/70">{error || "Deep Compare ist für diese Auswahl nicht verfügbar."}</section>;
  }
  const deepA = data.playerA;
  const deepB = data.playerB;
  return (
    <div className="space-y-6 sm:space-y-8">
      <ConsistencySection playerA={deepA} playerB={deepB} />
      <EventDominanceSection playerA={deepA} playerB={deepB} statsA={statsA} statsB={statsB} />
      <AttemptNumbersSection playerA={deepA} playerB={deepB} />
      <ProgressionSection playerA={playerA} playerB={playerB} dataA={deepA} dataB={deepB} />
      <BadgeBattleSection playerA={playerA} playerB={playerB} dataA={deepA} dataB={deepB} isAllTime={isAllTime} />
      <PrestigeSection playerA={deepA} playerB={deepB} isAllTime={isAllTime} />
      <StatMadnessSection playerA={deepA} playerB={deepB} />
      <LeadSummarySection playerA={playerA} playerB={playerB} dataA={deepA} dataB={deepB} statsA={statsA} statsB={statsB} />
    </div>
  );
}

function ConsistencySection({ playerA, playerB }: DeepPairProps) {
  const a = playerA.statistics.consistency;
  const b = playerB.statistics.consistency;
  const metrics: Metric[] = [
    metric("Längste 2,xx-Serie", a.sub3.longest, b.sub3.longest, "higher", countValue),
    metric("Aktuelle 2,xx-Serie", a.sub3.current, b.sub3.current, "higher", countValue),
    metric("Längste Sub-4-Serie", a.sub4.longest, b.sub4.longest, "higher", countValue),
    metric("Längste Serie ohne DNF", a.noDnf.longest, b.noDnf.longest, "higher", countValue),
    metric("Aktuelle Serie ohne DNF", a.noDnf.current, b.noDnf.current, "higher", countValue),
    metric("Konstanz / Streuung", a.standardDeviationHundredths, b.standardDeviationHundredths, "lower", hundredthsValue),
    metric("Zeitspanne", a.rangeHundredths, b.rangeHundredths, "lower", hundredthsValue),
    metric("PB-Abstand zum Ø", a.pbToAverageHundredths, b.pbToAverageHundredths, "lower", hundredthsValue),
    metric("PB-Abstand zum Median", a.pbToMedianHundredths, b.pbToMedianHundredths, "lower", hundredthsValue),
  ];
  return <MetricSection eyebrow="Rhythmus & Verlässlichkeit" title="Konstanz & Serien" metrics={metrics} description="DNF und ein Wert oberhalb des jeweiligen Limits beenden eine Serie." />;
}

function EventDominanceSection({ playerA, playerB, statsA, statsB }: DeepPairProps & { statsA: ActiveStatistics; statsB: ActiveStatistics }) {
  const a = playerA.statistics.eventDominance;
  const b = playerB.statistics.eventDominance;
  const podiumA = podiums(statsA);
  const podiumB = podiums(statsB);
  const metrics: Metric[] = [
    metric("Eventteilnahmen", statsA?.eventParticipations ?? null, statsB?.eventParticipations ?? null, "higher", countValue),
    metric("Siege", statsA?.wins ?? null, statsB?.wins ?? null, "higher", countValue),
    metric("Podiumsplätze", podiumA, podiumB, "higher", countValue),
    metric("Siegquote", rate(statsA?.wins ?? null, statsA?.eventParticipations ?? null), rate(statsB?.wins ?? null, statsB?.eventParticipations ?? null), "higher", percentValue),
    metric("Podiumquote", rate(podiumA, statsA?.eventParticipations ?? null), rate(podiumB, statsB?.eventParticipations ?? null), "higher", percentValue),
    metric("Eventführung gesamt", statsA?.eventLeadSeconds ?? null, statsB?.eventLeadSeconds ?? null, "higher", leadValue),
    metric("Eventbestzeiten gebrochen", statsA?.eventBestBreaks ?? null, statsB?.eventBestBreaks ?? null, "higher", countValue),
    metric("Schnellster erster Versuch", a.fastestFirstAttemptHundredths, b.fastestFirstAttemptHundredths, "lower", timeValue),
    metric("Bestes Event-Ø", a.bestEventAverageHundredths, b.bestEventAverageHundredths, "lower", timeValue),
    metric("Events mit Sub-3", a.eventsWithSub3, b.eventsWithSub3, "higher", countValue),
    metric("Sub-3-Eventquote", rate(a.eventsWithSub3, statsA?.eventParticipations ?? null), rate(b.eventsWithSub3, statsB?.eventParticipations ?? null), "higher", percentValue),
    metric("Events komplett ohne DNF", a.eventsWithoutDnf, b.eventsWithoutDnf, "higher", countValue),
    metric("Perfekte Sub-3-Events", a.perfectSub3Events, b.perfectSub3Events, "higher", countValue),
  ];
  return <MetricSection eyebrow="Performance im Event" title="Event-Dominanz" metrics={metrics} description="Event-Ø und Fun-Stats werden aus allen gebündelt geladenen Versuchen je Event berechnet." />;
}

function AttemptNumbersSection({ playerA, playerB }: DeepPairProps) {
  const [expanded, setExpanded] = useState(false);
  const pointsA = new Map(playerA.statistics.attemptNumbers.map((point) => [point.attemptNumber, point]));
  const pointsB = new Map(playerB.statistics.attemptNumbers.map((point) => [point.attemptNumber, point]));
  const numbers = [...new Set([...pointsA.keys(), ...pointsB.keys()])].sort((left, right) => left - right);
  const visible = visibleAttemptNumbers(numbers, expanded);
  const metrics = visible.map((attemptNumber) => metric(
    `Versuch ${attemptNumber}`,
    pointsA.get(attemptNumber)?.averageHundredths ?? null,
    pointsB.get(attemptNumber)?.averageHundredths ?? null,
    "lower",
    timeValue,
  ));
  return (
    <section className="panel overflow-hidden">
      <div className="p-5 pb-3 sm:p-7 sm:pb-4"><SectionHeading eyebrow="Jeder Slot im Event" title="Nach Versuchsnummer" /><p className="text-sm text-white/40">Durchschnitt aller gültigen Zeiten je Versuchnummer im gewählten Saisonkontext.</p></div>
      {metrics.length ? metrics.map((item) => <CompareMetricRow key={item.label} {...item} />) : <EmptyRows label="Noch keine Attempt-Number-Daten." />}
      {numbers.length > 5 && <div className="border-t border-white/[0.06] p-4 text-center"><Button type="button" variant="outline" size="sm" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}{expanded ? "Auf fünf Versuche reduzieren" : "Weitere Versuche anzeigen"}</Button></div>}
    </section>
  );
}

function ProgressionSection({ playerA, playerB, dataA, dataB }: { playerA: Player; playerB: Player; dataA: PlayerDeepCompareData; dataB: PlayerDeepCompareData }) {
  const pointsA = progressionPoints(dataA.progression.personal, playerA);
  const pointsB = progressionPoints(dataB.progression.personal, playerB);
  return (
    <section className="panel p-5 sm:p-7">
      <SectionHeading eyebrow="Gemeinsame Zeitachse" title="PB-Progression" />
      <ProgressionTimeline points={pointsA} comparisonPoints={pointsB} primaryLabel={playerA.name} comparisonLabel={playerB.name} comparisonInitiallyVisible compact showHistory={false} emptyLabel="Für beide Spieler ist noch keine PB-Progression vorhanden." />
    </section>
  );
}

function BadgeBattleSection({ playerA, playerB, dataA, dataB, isAllTime }: { playerA: Player; playerB: Player; dataA: PlayerDeepCompareData; dataB: PlayerDeepCompareData; isAllTime: boolean }) {
  const battle = useMemo(() => compareBadgeCollections(dataA.badges, dataB.badges), [dataA.badges, dataB.badges]);
  return (
    <section className="panel p-5 sm:p-7">
      <SectionHeading eyebrow={isAllTime ? "Sichtbare Karriere-Badges" : "Karriere / All-Time"} title="Badge Battle" />
      <div className="grid gap-3 md:grid-cols-3">
        <BadgeColumn title={`Nur ${playerA.name}`} badges={battle.onlyA.map((badge) => badge.name)} />
        <BadgeColumn title="Gemeinsam" badges={battle.shared.map(({ playerA: badge }) => badge.name)} featured />
        <BadgeColumn title={`Nur ${playerB.name}`} badges={battle.onlyB.map((badge) => badge.name)} />
      </div>
      <p className="mt-4 text-center text-xs text-white/35">{dataA.badges.length} : {dataB.badges.length} sichtbare Karriere-Badges · keine eigene Badge-Wertung</p>
    </section>
  );
}

function PrestigeSection({ playerA, playerB, isAllTime }: DeepPairProps & { isAllTime: boolean }) {
  const a = playerA.prestige;
  const b = playerB.prestige;
  const metrics = [
    metric("PB-Verbesserungen", a.pbCount, b.pbCount, "higher", countValue),
    metric("Größter PB-Sprung", a.largestPbImprovementHundredths, b.largestPbImprovementHundredths, "higher", hundredthsValue),
    metric("Weltrekorde", a.worldRecordCount, b.worldRecordCount, "higher", countValue),
    metric("Tage mit WR", a.worldRecordDays, b.worldRecordDays, "higher", dayValue),
    metric("Längste WR-Phase", a.longestWorldRecordDays, b.longestWorldRecordDays, "higher", dayValue),
  ];
  return <MetricSection eyebrow={isAllTime ? "Historische Rekordwerte" : "Karriere / All-Time"} title="Prestige & Records" metrics={metrics} description="Vorhandene Prestige-Werte ohne neue Formel oder Compare-Score." />;
}

function StatMadnessSection({ playerA, playerB }: DeepPairProps) {
  const a = playerA.statistics.madness;
  const b = playerB.statistics.madness;
  const metrics = [
    metric("Häufigste exakte Zeit", a.modalTimeHundredths, b.modalTimeHundredths, null, timeValue),
    metric("Treffer des Modalwerts", a.modalTimeHits || null, b.modalTimeHits || null, "higher", countValue),
    metric("Exakte Wiederholungen", a.exactRepeatCount, b.exactRepeatCount, "higher", countValue),
    metric("Innerhalb 0,25 s vom PB", a.withinQuarterSecondOfPbPercent, b.withinQuarterSecondOfPbPercent, "higher", percentValue),
    metric("Innerhalb 0,50 s vom PB", a.withinHalfSecondOfPbPercent, b.withinHalfSecondOfPbPercent, "higher", percentValue),
    metric("Verschiedene Sub-3-Zeiten", a.distinctSub3Times, b.distinctSub3Times, "higher", countValue),
    metric("Häufigste Hundertstel", a.mostCommonHundredth, b.mostCommonHundredth, null, hundredthEndingValue),
    metric("Treffer der Hundertstel", a.mostCommonHundredthHits || null, b.mostCommonHundredthHits || null, "higher", countValue),
  ];
  return <MetricSection eyebrow="Eindeutig ableitbare Nerd-Werte" title="Stat Madness" metrics={metrics} description="Modalwerte werden nur gezeigt, wenn genau eine Zeit beziehungsweise Endung am häufigsten vorkommt." />;
}

function LeadSummarySection({ playerA, playerB, dataA, dataB, statsA, statsB }: { playerA: Player; playerB: Player; dataA: PlayerDeepCompareData; dataB: PlayerDeepCompareData; statsA: ActiveStatistics; statsB: ActiveStatistics }) {
  const a = dataA.statistics;
  const b = dataB.statistics;
  const values: ComparableValue[] = [
    comparable(a.consistency.standardDeviationHundredths, b.consistency.standardDeviationHundredths, "lower"),
    comparable(a.consistency.rangeHundredths, b.consistency.rangeHundredths, "lower"),
    comparable(a.consistency.sub3.longest, b.consistency.sub3.longest, "higher"),
    comparable(a.consistency.sub4.longest, b.consistency.sub4.longest, "higher"),
    comparable(a.consistency.noDnf.longest, b.consistency.noDnf.longest, "higher"),
    comparable(rate(statsA?.wins ?? null, statsA?.eventParticipations ?? null), rate(statsB?.wins ?? null, statsB?.eventParticipations ?? null), "higher"),
    comparable(a.eventDominance.fastestFirstAttemptHundredths, b.eventDominance.fastestFirstAttemptHundredths, "lower"),
    comparable(a.eventDominance.bestEventAverageHundredths, b.eventDominance.bestEventAverageHundredths, "lower"),
    comparable(a.eventDominance.eventsWithSub3, b.eventDominance.eventsWithSub3, "higher"),
    comparable(a.madness.withinQuarterSecondOfPbPercent, b.madness.withinQuarterSecondOfPbPercent, "higher"),
    comparable(a.madness.distinctSub3Times, b.madness.distinctSub3Times, "higher"),
  ];
  const summary = calculateCompareLeadSummary(values);
  return (
    <section className="panel flex flex-col items-center gap-3 p-6 text-center sm:p-8">
      <BarChart3 className="context-accent-text size-6" />
      <p className="font-display text-xl font-black uppercase sm:text-2xl">{playerA.name} liegt bei {summary.playerALeads} von {summary.compared} Deep-Stats vorn.</p>
      <p className="text-sm text-white/40">{playerB.name} liegt bei {summary.playerBLeads} Werten vorn · {summary.ties} Gleichstände</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">Experimentelle Übersicht · kein Gesamtsieger und keine Gewichtung</p>
    </section>
  );
}

function MetricSection({ eyebrow, title, description, metrics }: { eyebrow: string; title: string; description: string; metrics: Metric[] }) {
  return <section className="panel overflow-hidden"><div className="p-5 pb-3 sm:p-7 sm:pb-4"><SectionHeading eyebrow={eyebrow} title={title} /><p className="text-sm text-white/40">{description}</p></div>{metrics.map((item) => <CompareMetricRow key={item.label} {...item} />)}</section>;
}

function BadgeColumn({ title, badges, featured = false }: { title: string; badges: string[]; featured?: boolean }) {
  return <article className={`rounded-2xl border p-4 ${featured ? "border-gold-400/20 bg-gold-400/[0.04]" : "border-white/[0.07] bg-white/[0.025]"}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{title} · {badges.length}</p><div className="mt-3 flex flex-wrap gap-2">{badges.length ? badges.map((badge) => <span key={badge} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/65">{badge}</span>) : <span className="text-xs text-white/30">Keine</span>}</div></article>;
}

function EmptyRows({ label }: { label: string }) {
  return <p className="border-t border-white/[0.06] p-8 text-center text-sm text-white/35">{label}</p>;
}

function progressionPoints(points: ProgressionPoint[], player: Player): TimelinePoint[] {
  return points.map((point) => ({ ...point, playerId: player.id, playerName: player.name, avatarUrl: player.avatarUrl, hasExactTime: point.sourceType === "attempt" }));
}

function metric(label: string, left: number | null, right: number | null, direction: CompareDirection | null, format: (value: number | null) => { raw: number | null; display: string }): Metric {
  return { label, direction, left: format(left), right: format(right) };
}

function comparable(left: number | null, right: number | null, direction: CompareDirection): ComparableValue {
  return { left, right, direction };
}

function countValue(value: number | null) { return { raw: value, display: value == null ? "—" : value.toLocaleString("de-DE") }; }
function timeValue(value: number | null) { return { raw: value, display: value == null ? "—" : formatTime(value / 100) }; }
function hundredthsValue(value: number | null) { return { raw: value, display: value == null ? "—" : formatTime(value / 100) }; }
function percentValue(value: number | null) { return { raw: value, display: value == null ? "—" : `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` }; }
function dayValue(value: number | null) { return { raw: value, display: value == null ? "—" : `${value.toLocaleString("de-DE")} Tage` }; }
function leadValue(value: number | null) { return { raw: value, display: value == null ? "—" : formatLead(value) }; }
function hundredthEndingValue(value: number | null) { return { raw: value, display: value == null ? "—" : `…${String(value).padStart(2, "0")}` }; }

function rate(numerator: number | null, denominator: number | null) {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return Math.round(numerator * 1_000 / denominator) / 10;
}

function podiums(stats: ActiveStatistics) {
  return stats == null ? null : stats.wins + stats.secondPlaces + stats.thirdPlaces;
}

function formatLead(seconds: number) {
  if (seconds < 60) return `${seconds} Sek.`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} Std. ${minutes} Min.` : `${minutes} Min.`;
}

interface DeepPairProps {
  playerA: PlayerDeepCompareData;
  playerB: PlayerDeepCompareData;
}
