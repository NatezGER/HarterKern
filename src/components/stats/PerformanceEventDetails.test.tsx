import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PerformanceEventDetails } from "./PerformanceEventDetails";
import { PerformanceRankings } from "./PerformanceRankings";
import { performanceEventMetrics } from "@/constants/performanceEventMetrics";
import type { MetricRankEntry, RankedMetric } from "@/types/statDashboard";

const event = { eventId: "event-1", eventName: "Finale", eventDate: "2026-11-10" };
const entry: MetricRankEntry = { rank: 1, playerId: "a", name: "Alex", avatarUrl: null,
  value: 15, count: 1, total: 2, detail: "In 1 von 2 Events im letzten Viertel verbessert." };

describe("PR B event evidence", () => {
  it("shows the median, zero-gain events and every last-quarter attempt including DNF", () => {
    const html = renderToStaticMarkup(<PerformanceEventDetails entry={{ ...entry, endspurtEvidence: [
      { ...event, attemptCount: 8, beforePb: 305, finalPb: 275, gain: 30,
        lastQuarter: [{ attemptId: "a7", attemptNumber: 7, timeHundredths: 275, isDnf: false },
          { attemptId: "a8", attemptNumber: 8, timeHundredths: null, isDnf: true }] },
      { ...event, eventId: "event-2", attemptCount: 5, beforePb: 300, finalPb: 300, gain: 0,
        lastQuarter: [{ attemptId: "b5", attemptNumber: 5, timeHundredths: 310, isDnf: false }] },
    ] }} />);
    for (const text of ["<details", "<summary", "0,15 s", "0,00 s", "3,05 s", "2,75 s", "#7", "#8: DNF", "2 qualifizierende Events"]) expect(html).toContain(text);
    expect(html).toContain('href="/events/event-1"');
  });
  it("keeps multiple opponents within one rivalry event", () => {
    const html = renderToStaticMarkup(<PerformanceEventDetails entry={{ ...entry, value: 1, rivalryEvidence: [
      { ...event, opponents: [{ playerId: "b", name: "Ben", takeovers: 3 }, { playerId: "c", name: "Chris", takeovers: 4 }] },
    ] }} />);
    expect(html).toContain("1 unterschiedliche qualifizierte Events");
    expect(html.match(/href="\/events/g)).toHaveLength(1);
    expect(html).toContain("3 direkte Paar-Takeovers"); expect(html).toContain("4 direkte Paar-Takeovers");
    expect(html).toContain('href="/player/b"');
  });
  it("shows three actively overtaken opponents under the triggering attempt", () => {
    const html = renderToStaticMarkup(<PerformanceEventDetails entry={{ ...entry, value: 3, chaosEvidence: [
      { ...event, attemptId: "a2", attemptNumber: 2, submittedAt: "2026-11-10T20:00:00Z", beforePb: 350, newPb: 270, takeovers: 3,
        opponents: [{ playerId: "b", name: "Ben", bestHundredths: 280 }, { playerId: "c", name: "Chris", bestHundredths: 300 }, { playerId: "d", name: "Dan", bestHundredths: 320 }] },
    ] }} />);
    for (const text of ["Versuch #2", "3 Gegner", "3,50 s", "2,70 s", "2,80 s", "3,00 s", "3,20 s"]) expect(html).toContain(text);
    expect(html).not.toContain("Versuch-ID");
  });
  it("places new cards only in V and VII, keeps top five and profile links", () => {
    const metrics: RankedMetric[] = performanceEventMetrics.map(def => ({ ...def, overallValue: 1, overallCount: null,
      overallTotal: null, overallDetail: null, rankings: Array.from({ length: 6 }, (_, i) => ({ ...entry, playerId: String(i), name: `Player ${i}` })) }));
    const html = renderToStaticMarkup(<PerformanceRankings metrics={metrics} />);
    expect(html.indexOf('data-metric-key="performance-endspurt"')).toBeLessThan(html.indexOf('id="performance-leadership"'));
    expect(html.indexOf('data-metric-key="performance-rivalry-events"')).toBeLessThan(html.indexOf('data-metric-key="performance-chaos-takeovers"'));
    expect(html).toContain('href="/player/0"'); expect(html).not.toContain("Player 5");
    expect(html).not.toContain("VI. Form"); expect(html).not.toContain('data-metric-key="late-bloomer"');
  });
});
