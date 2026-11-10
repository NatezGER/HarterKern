import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PerformanceDevelopmentDetails } from "./PerformanceDevelopmentDetails";
import { PerformanceRankings } from "./PerformanceRankings";
import { performanceDevelopmentMetrics } from "@/constants/performanceDevelopmentMetrics";
import { parseDevelopmentEvidence } from "@/services/performanceDevelopmentEvidence";
import { formatMetricValue } from "@/utils/statMetricFormat";
import type { DevelopmentEvidence, DevelopmentSource } from "@/types/performanceDevelopment";
const source: DevelopmentSource = { id: "a", date: "2026-01-01", time: 300, source: "historical_attempt", exact: false, eventId: null };
const window = Array.from({ length: 5 }, (_, i) => ({ ...source, id: String(i) }));
export const evidences: DevelopmentEvidence[] = [
  { kind: "spiral", eventId: "e", eventName: "Finale", eventDate: "2026-01-01", start: 1, end: 4, length: 3, attempts: [340,320,310,295].map((time,i) => ({ id: String(i),number:i+1,time })) },
  { kind: "trend", olderMedian: 340, newerMedian: 305, samples: 10, older: window, newer: window },
  { kind: "hunt", before: source, after: { ...source, time: 270 }, length: 13, intermediate: 12 },
  { kind: "plateau", pb: source, first: source, last: source, length: 24, season: 2026 },
  { kind: "near", total: 21, limit: 20, hits: [{ ...source, time: 310, priorPb: 300, gap: 10 }] },
  { kind: "consistent", samples: 10, cv: 1.234, mean: 300.125, population: 7, target: 3, cutoff: 1.234, qualified: 4 },
];
it.each(evidences)("validates and renders $kind without losing evidence", evidence => {
  expect(parseDevelopmentEvidence(evidence)).toEqual(evidence);
  const html = renderToStaticMarkup(<PerformanceDevelopmentDetails evidence={evidence} />);
  expect(html).toContain("<details"); expect(html).toContain("<summary");
  if (["hunt","plateau","trend","near"].includes(evidence.kind)) expect(html).toContain("nur Datum; Importreihenfolge");
  if (evidence.kind === "spiral") { expect(html).toContain("3 Übergänge"); expect(html).toContain("Versuche 1–4"); expect(html).toContain('/events/e'); }
  if (evidence.kind === "hunt") expect(html).toContain("13 gültige Versuche, davon 12 Zwischenversuche");
  if (evidence.kind === "plateau") expect(html).toContain("Stand am Saisonende 2026");
  if (evidence.kind === "near") expect(html).toContain("auf 20 begrenzt");
  if (evidence.kind === "consistent") expect(html).toContain("3,0013 s");
});
it("rejects invalid windows, nonfinite values and out-of-bound near misses", () => {
  expect(parseDevelopmentEvidence({ ...evidences[1], older: [] })).toBeUndefined();
  expect(parseDevelopmentEvidence({ ...evidences[5], mean: NaN })).toBeUndefined();
  expect(parseDevelopmentEvidence({ ...evidences[4], hits: [{ ...source, priorPb: 300, gap: 11 }] })).toBeUndefined();
  expect(parseDevelopmentEvidence(null)).toBeUndefined();
  expect(formatMetricValue(300.125, "precise-time")).toBe("3,0013 s");
});
it("places all eight cards and five development cards in the navigation with top five links", () => {
  const metrics = performanceDevelopmentMetrics.map(m => ({ ...m, overallValue:null,overallCount:null,overallTotal:null,overallDetail:null,
    rankings: Array.from({length:6},(_,i) => ({playerId:String(i),name:`Player ${i}`,rank:1,value:3,avatarUrl:null,count:null,total:null,detail:null,developmentEvidence:evidences[0]})) }));
  const html = renderToStaticMarkup(<PerformanceRankings metrics={metrics} />);
  for (const m of metrics) expect(html).toContain(`data-metric-key="${m.key}"`);
  expect(html).toContain('href="#performance-development"');
  expect(html).toContain('href="/player/0"'); expect(html).not.toContain("Player 5");
  expect(metrics).toHaveLength(8);
  expect(html.indexOf('performance-upward-spiral')).toBeLessThan(html.indexOf('performance-plateau'));
});
