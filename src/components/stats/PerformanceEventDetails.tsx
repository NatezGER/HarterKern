import type { ReactNode } from "react";
import type { MetricRankEntry } from "@/types/statDashboard";
import type { PerformanceEventReference } from "@/types/performanceEvidence";
import { formatMetricValue } from "@/utils/statMetricFormat";

function EventReference({ event }: { event: PerformanceEventReference }) {
  return <p className="break-words"><a href={`/events/${event.eventId}`} className="text-gold-200 underline">{event.eventName}</a> · {event.eventDate}</p>;
}

function EvidenceDisclosure({ title, children, embedded }: { title: string; children: ReactNode; embedded?: boolean }) {
  const Wrapper = embedded ? "div" : "details";
  return <Wrapper className="mt-2 min-w-0 border-t border-white/10 pt-2 text-xs text-white/65">
    {!embedded && <summary className="cursor-pointer rounded py-1 font-bold text-gold-200 focus-visible:outline focus-visible:outline-gold-300">{title}</summary>}
    <div className="mt-2 space-y-3 [overflow-wrap:anywhere]">{children}</div>
  </Wrapper>;
}

export function PerformanceEventDetails({ entry, embedded = false }: { entry: MetricRankEntry; embedded?: boolean }) {
  if (entry.endspurtEvidence?.length) return <EvidenceDisclosure embedded={embedded} title="Endspurt-Events ansehen">
    <p>Median-Endspurtgewinn: {formatMetricValue(entry.value, "time-gain")} · {entry.total} qualifizierende Events, davon {entry.count} erfolgreich.</p>
    {entry.endspurtEvidence.map(event => <div key={event.eventId} className="rounded-lg bg-white/5 p-2">
      <EventReference event={event} />
      <p>{event.attemptCount} eigene Versuche · PB vorher: {formatMetricValue(event.beforePb, "time")} · Finale PB: {formatMetricValue(event.finalPb, "time")}</p>
      <p>Endspurtgewinn: {formatMetricValue(event.gain, "time-gain")}</p>
      <ol className="mt-2 flex flex-wrap gap-2" aria-label="Versuche im letzten Viertel">
        {event.lastQuarter.map(attempt => <li key={attempt.attemptId} className="rounded bg-black/20 px-2 py-1 tabular-nums">
          #{attempt.attemptNumber}: {attempt.isDnf ? "DNF" : attempt.timeHundredths == null ? "Ungültig" : formatMetricValue(attempt.timeHundredths, "time")}
        </li>)}
      </ol>
    </div>)}
  </EvidenceDisclosure>;
  if (entry.rivalryEvidence?.length) return <EvidenceDisclosure embedded={embedded} title="Details ansehen">
    <p>{entry.value} qualifizierte Rivalry-Paarungen · höchstens fünf jüngste Events</p>
    {entry.rivalryEvidence.slice(0, 5).map(event => <div key={event.eventId} className="rounded-lg bg-white/5 p-2">
      <EventReference event={event} />
      <ul className="mt-1 space-y-1">{event.opponents.map(opponent => <li key={opponent.playerId}>
        <a href={`/player/${opponent.playerId}`} className="text-gold-200 underline">{opponent.name}</a>: {opponent.takeovers} direkte Paar-Takeovers
      </li>)}</ul>
    </div>)}
  </EvidenceDisclosure>;
  if (entry.chaosEvidence?.length) return <EvidenceDisclosure embedded={embedded} title="Details ansehen">
    <p>{entry.value} aktive Takeovers insgesamt · höchstens fünf jüngste Versuche und fünf Gegner pro Versuch</p>
    {entry.chaosEvidence.slice(0, 5).map(attempt => <div key={attempt.attemptId} className="rounded-lg bg-white/5 p-2">
      <EventReference event={attempt} />
      <p>Versuch #{attempt.attemptNumber} · {attempt.eventDate}</p>
      <p>PB vorher: {formatMetricValue(attempt.beforePb, "time")} → Neue PB: {formatMetricValue(attempt.newPb, "time")}</p>
      <p>{attempt.takeovers} Gegner mit diesem Versuch überholt:</p>
      <ul className="mt-1 space-y-1">{attempt.opponents.slice(0, 5).map(opponent => <li key={opponent.playerId}>
        <a href={`/player/${opponent.playerId}`} className="text-gold-200 underline">{opponent.name}</a>: damalige PB {formatMetricValue(opponent.bestHundredths, "time")}
      </li>)}</ul>
    </div>)}
  </EvidenceDisclosure>;
  return null;
}
