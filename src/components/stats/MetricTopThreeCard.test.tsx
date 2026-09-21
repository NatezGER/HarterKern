import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MetricRankingCard } from "@/components/stats/MetricRankingCard";
import type { RankedMetric } from "@/types/statDashboard";

const metric: RankedMetric = {
  key: "sub3", title: "Unter 3 Sekunden", description: "Gültige Zeiten",
  format: "percent", direction: "desc", minimumSample: 1, group: "performance",
  overallValue: 34.7, overallCount: 128, overallTotal: 369, overallDetail: null,
  rankings: [
    { rank: 1, playerId: "a", name: "Lars", avatarUrl: "https://cdn.test/a.png", value: 52.1, count: 25, total: 48, detail: null },
    { rank: 1, playerId: "b", name: "Paul", avatarUrl: null, value: 52.1, count: 22, total: 46, detail: null },
    { rank: 3, playerId: "c", name: "Fipsi", avatarUrl: null, value: 41.2, count: 14, total: 34, detail: null },
    { rank: 4, playerId: "d", name: "Mia", avatarUrl: "https://cdn.test/d.png", value: 39, count: 13, total: 33, detail: null },
    { rank: 5, playerId: "e", name: "Nate", avatarUrl: "https://cdn.test/e.png", value: 38, count: 12, total: 32, detail: null },
  ],
};

describe("shared metric ranking card", () => {
  it("shows scope total, five avatars and competition ranks 1/1/3", () => {
    const markup = renderToStaticMarkup(<MetricRankingCard metric={metric} />);
    expect(markup).toContain("128 / 369");
    expect(markup).toContain("25 / 48");
    expect(markup).toContain("https://cdn.test/a.png");
    expect(markup).toMatch(/1\.<\/span>.*Lars/);
    expect(markup).toMatch(/1\.<\/span>.*Paul/);
    expect(markup).toMatch(/3\.<\/span>.*Fipsi/);
    expect(markup).toContain("https://cdn.test/d.png");
    expect(markup).toContain("https://cdn.test/e.png");
    expect(markup.match(/aria-label="Profilbild von /g)).toHaveLength(5);
    expect(markup.match(/border-gold-400\/20/g)).toHaveLength(1);
    expect(markup).toMatch(/border-gold-400\/20[^>]*>.*Profilbild von Lars/);
  });

  it("renders a short ranking without placeholders", () => {
    const markup = renderToStaticMarkup(<MetricRankingCard metric={{ ...metric, rankings: metric.rankings.slice(0, 1) }} />);
    expect(markup).toContain("Lars");
    expect(markup).not.toContain("Paul");
    expect(markup).not.toContain("Fipsi");
  });
});
