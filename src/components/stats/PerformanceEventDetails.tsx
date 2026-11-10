import type { ReactNode } from "react";
import type { MetricRankEntry } from "@/types/statDashboard";
import type { PerformanceEventReference } from "@/types/performanceEvidence";
import { formatMetricValue } from "@/utils/statMetricFormat";

function EventReference({ event }: { event: PerformanceEventReference }) {
  return <p className="break-words"><a href={`/events/${event.eventId}`} className="text-gold-200 underline">{event.eventName}</a> · {event.eventDate}</p>;
}

function EvidenceDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="mt-2 min-w-0 border-t border-white/10 pt-2 text-xs text-white/65">
    <summary className="cursor-pointer rounded py-1 font-bold text-gold-200 focus-visible:outline focus-visible:outline-gold-300">{title}</summary>
    <div className="mt-2 space-y-3 [overflow-wrap:anywhere]">{children}</div>
  </details>;
}

export function PerformanceEventDetails({ entry }: { entry: MetricRankEntry }) {
  if (entry.endspurtEvidence?.length) return <EvidenceDisclosure title="Endspurt-Events ansehen">
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
  if (entry.rivalryEvidence?.length) return <EvidenceDisclosure title="Rivalry-Events ansehen">
    <p>{entry.value} unterschiedliche qualifizierte Events</p>
    {entry.rivalryEvidence.map(event => <div key={event.eventId} className="rounded-lg bg-white/5 p-2">
      <EventReference event={event} />
      <ul className="mt-1 space-y-1">{event.opponents.map(opponent => <li key={opponent.playerId}>
        <a href={`/player/${opponent.playerId}`} className="text-gold-200 underline">{opponent.name}</a>: {opponent.takeovers} direkte Paar-Takeovers
      </li>)}</ul>
    </div>)}
  </EvidenceDisclosure>;
  if (entry.chaosEvidence?.length) return <EvidenceDisclosure title="Aktive Überholungen ansehen">
    <p>{entry.value} aktive Takeovers insgesamt</p>
    {entry.chaosEvidence.map(attempt => <div key={attempt.attemptId} className="rounded-lg bg-white/5 p-2">
      <EventReference event={attempt} />
      <p>Versuch #{attempt.attemptNumber} am <time dateTime={attempt.submittedAt}>{attempt.submittedAt}</time></p>
      <p>PB vorher: {formatMetricValue(attempt.beforePb, "time")} → Neue PB: {formatMetricValue(attempt.newPb, "time")}</p>
      <p>{attempt.takeovers} Gegner mit diesem Versuch überholt:</p>
      <ul className="mt-1 space-y-1">{attempt.opponents.map(opponent => <li key={opponent.playerId}>
        <a href={`/player/${opponent.playerId}`} className="text-gold-200 underline">{opponent.name}</a>: damalige PB {formatMetricValue(opponent.bestHundredths, "time")}
      </li>)}</ul>
    </div>)}
  </EvidenceDisclosure>;
  return null;
}
