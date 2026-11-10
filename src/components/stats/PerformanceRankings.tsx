import { useState } from "react";
import { MetricRankingCard } from "./MetricRankingCard";
import { PerformanceEventDetails } from "./PerformanceEventDetails";
import { performanceSections, timeThresholds } from "@/constants/performanceSections";
import { formatMetricValue } from "@/utils/statMetricFormat";
import type { FiveWindowEvidence, RankedMetric } from "@/types/statDashboard";

export function FiveWindowDetails({ evidence }: { evidence: FiveWindowEvidence }) {
  return <details className="mt-2 border-t border-white/10 pt-2 text-xs text-white/65">
    <summary className="cursor-pointer rounded py-1 font-bold text-gold-200 focus-visible:outline focus-visible:outline-gold-300">Die fünf Versuche ansehen</summary>
    <a className="mt-2 block break-words text-gold-200 underline" href={`/events/${evidence.eventId}`}>{evidence.eventName}</a>
    <p>{evidence.eventDate} · Versuche {evidence.startAttempt}–{evidence.endAttempt}</p>
    <ol className="my-2 flex flex-wrap gap-2" aria-label="Fünf aufeinanderfolgende Zeiten">
      {evidence.times.map((time, i) => <li key={evidence.attemptIds[i]} className="rounded bg-white/5 px-2 py-1 tabular-nums">#{evidence.startAttempt + i}: {formatMetricValue(time, "time")}</li>)}
    </ol>
    <p>Durchschnitt: {formatMetricValue(evidence.averageHundredths, "time")}</p>
  </details>;
}

export function ThresholdRankingCard({ metrics }: { metrics: RankedMetric[] }) {
  const [selected, setSelected] = useState<string>("sub5");
  return <ThresholdRankingContent metrics={metrics} selected={selected} onSelect={setSelected} />;
}

export function ThresholdRankingContent({ metrics, selected, onSelect }: { metrics: RankedMetric[]; selected: string; onSelect: (key: string) => void }) {
  const metric = metrics.find(m => m.key === selected);
  if (!metric) return null;
  return <MetricRankingCard metric={{ ...metric, compact: false, title: "Unter X Sekunden" }} controls={
    <div role="group" aria-label="Zeitgrenze in Sekunden" className="mt-3 grid grid-cols-5 gap-1">
      {timeThresholds.map(option => <button key={option.key} type="button" aria-pressed={selected === option.key}
        onClick={() => onSelect(option.key)} className={`min-w-0 rounded-lg py-2 text-xs font-bold tabular-nums focus-visible:outline focus-visible:outline-gold-300 ${selected === option.key ? "bg-gold-300 text-black" : "bg-white/5 text-white/70"}`}>
        {option.label}
      </button>)}
    </div>
  } />;
}

export function PerformanceRankings({ metrics }: { metrics: RankedMetric[] }) {
  const byKey = new Map(metrics.map(metric => [metric.key, metric]));
  const sections = performanceSections.filter(section => section.keys.some(key => key === "thresholds" ? byKey.has("sub5") : byKey.has(key)));
  return <div className="space-y-8">
    <nav aria-label="Performance-Bereiche" className="flex flex-wrap gap-2 text-xs text-gold-200">
      {sections.map(section => <a key={section.id} href={`#performance-${section.id}`} className="rounded-lg bg-white/5 px-3 py-2">{section.title}</a>)}
      <a href="#performance-bingo" className="rounded-lg bg-white/5 px-3 py-2">IX. BINGO & Most Wanted</a>
    </nav>
    {sections.map(section => <section key={section.id} id={`performance-${section.id}`} className="scroll-mt-28" aria-labelledby={`heading-${section.id}`}>
      <h3 id={`heading-${section.id}`} className="mb-4 border-b border-gold-300/15 pb-2 font-display text-xl font-black text-gold-200 sm:text-2xl">{section.title}</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-metric-dashboard>
        {section.keys.map(key => key === "thresholds" ? <ThresholdRankingCard key={key} metrics={metrics} /> : byKey.has(key) &&
          <MetricRankingCard key={key} metric={byKey.get(key)!} linkPlayers={key.startsWith("performance-")} wrapDetail={key === "performance-endspurt"}
            renderDetails={key === "best-five-window" ? entry => entry.windowEvidence && <FiveWindowDetails evidence={entry.windowEvidence} />
              : key.startsWith("performance-") ? entry => <PerformanceEventDetails entry={entry} /> : undefined} />)}
      </div>
    </section>)}
  </div>;
}
