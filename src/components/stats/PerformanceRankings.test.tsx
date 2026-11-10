import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PerformanceRankings, ThresholdRankingContent, FiveWindowDetails } from "./PerformanceRankings";
import { statisticMetricRegistry } from "@/constants/statMetricRegistry";
import { timeThresholds } from "@/constants/performanceSections";
import type { RankedMetric } from "@/types/statDashboard";

const metrics: RankedMetric[] = statisticMetricRegistry.map((definition, i) => ({ ...definition,
  overallValue: 50, overallCount: 5, overallTotal: 10, overallDetail: null,
  rankings: Array.from({ length: 6 }, (_, n) => ({ rank: n < 2 ? 1 : n + 1, playerId: `${i}-${n}`,
    name: `${definition.key} Spieler ${n}`, avatarUrl: null, value: 50, count: 5, total: 10, detail: null })),
}));

describe("Performance PR A composition", () => {
  it("orders only the requested groups and preserves four record cards", () => {
    const html = renderToStaticMarkup(<PerformanceRankings metrics={metrics} />);
    const ids = ["speed", "consistency", "precision", "volume", "start", "leadership", "records"];
    ids.forEach((id, i) => {
      expect(html).toContain(`id="performance-${id}"`);
      if (i) expect(html.indexOf(`id="performance-${ids[i - 1]}"`)).toBeLessThan(html.indexOf(`id="performance-${id}"`));
    });
    for (const key of ["one-shot", "late-bloomer", "clutch", "event-breaks", "chaos-magnet", "badge-total", "rivalry-events"]) {
      expect(html).not.toContain(`data-metric-key="${key}"`);
    }
    for (const key of ["pb-jump", "wr-reign", "wr-improvements", "wr-jump"]) expect(html).toContain(`data-metric-key="${key}"`);
    expect(html).not.toContain("VI. Form");
    expect(html.match(/Unter X Sekunden/g)).toHaveLength(1);
    expect(html).not.toContain("Spieler 5");
  });

  it.each(timeThresholds)("shows the existing top five and counts for $key", option => {
    const onSelect = vi.fn();
    const view = ThresholdRankingContent({ metrics, selected: option.key, onSelect });
    const html = renderToStaticMarkup(view);
    expect(html).toContain(`data-metric-key="${option.key}"`);
    expect(html).toContain(`${option.key} Spieler 0`);
    expect(html).not.toContain(`${option.key} Spieler 5`);
    expect(html).toContain("5 / 10");
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    for (const choice of timeThresholds) expect(html).toContain(choice.label);
    // Controls only emit a local selection; they do not fetch or navigate.
    const controls = view!.props.controls;
    controls.props.children.find((button: { key: string }) => button.key === option.key).props.onClick();
    expect(onSelect).toHaveBeenCalledWith(option.key);
  });

  it("exposes the complete server evidence through native keyboard/tap details", () => {
    const html = renderToStaticMarkup(<FiveWindowDetails evidence={{ eventId: "e", eventName: "Finale",
      eventDate: "2026-01-01", startAttempt: 3, endAttempt: 7, times: [200, 210, 220, 230, 240],
      attemptIds: ["a", "b", "c", "d", "e"], averageHundredths: 220 }} />);
    expect(html).toContain("<details"); expect(html).toContain("<summary");
    expect(html).toContain('href="/events/e"'); expect(html).toContain("Versuche 3–7");
    expect(html.match(/<li /g)).toHaveLength(5);
    for (const value of ["2,00", "2,10", "2,20", "2,30", "2,40"]) expect(html).toContain(value);
    expect(html).toContain("Durchschnitt: 2,20");
  });
});
