import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MetricRankingCard } from "@/components/stats/MetricRankingCard";
import type { RankedMetric } from "@/types/statDashboard";

vi.mock("@/hooks/useAwardAssets", () => ({
  useAwardAssetUrl: (id: string) => ({
    "medal:statistics:gold": "https://assets.test/gold.png",
    "medal:statistics:silver": "https://assets.test/silver.png",
    "medal:statistics:bronze": "https://assets.test/bronze.png",
  })[id] ?? null,
}));

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
    { rank: 6, playerId: "f", name: "Nicht Top 5", avatarUrl: null, value: 37, count: 11, total: 31, detail: null },
  ],
};

describe("shared metric ranking card", () => {
  it("shows scope total, five avatars and competition ranks 1/1/3", () => {
    const markup = renderToStaticMarkup(<MetricRankingCard metric={metric} />);
    expect(markup).toContain("128 / 369");
    expect(markup).toContain("25 / 48");
    expect(markup).toContain("https://cdn.test/a.png");
    expect(markup).toContain("34,7 %");
    const rows = markup.match(/<li\b[^>]*>[\s\S]*?<\/li>/g) ?? [];
    expect(rows).toHaveLength(5);
    for (const [index, entry] of metric.rankings.slice(0, 5).entries()) {
      expect(rows[index]).toContain(`aria-label="Profilbild von ${entry.name}"`);
      expect(rows[index]).toContain(`>${entry.name}</p>`);
      expect(rows[index]).toContain(`${entry.count} / ${entry.total}`);
      if (entry.avatarUrl) expect(rows[index]).toContain(`src="${entry.avatarUrl}"`);
    }
    for (const row of rows.slice(0, 2)) {
      expect(row).toContain('<span class="sr-only">Platz 1</span>');
      expect(row).toContain('src="https://assets.test/gold.png"');
    }
    expect(rows[2]).toContain('<span class="sr-only">Platz 3</span>');
    expect(rows[2]).toContain('src="https://assets.test/bronze.png"');
    expect(markup.match(/src="https:\/\/assets.test\/gold.png"/g)).toHaveLength(2);
    expect(markup.match(/src="https:\/\/assets.test\/bronze.png"/g)).toHaveLength(1);
    expect(markup).not.toContain('src="https://assets.test/silver.png"');
    expect(markup).not.toContain("Platz 2");
    expect(markup).toContain("https://cdn.test/d.png");
    expect(markup).toContain("https://cdn.test/e.png");
    expect(markup).not.toContain("Nicht Top 5");
    expect(markup.match(/aria-label="Profilbild von /g)).toHaveLength(5);
  });

  it("renders a short ranking without placeholders", () => {
    const markup = renderToStaticMarkup(<MetricRankingCard metric={{ ...metric, rankings: metric.rankings.slice(0, 1) }} />);
    expect(markup).toContain("Lars");
    expect(markup).not.toContain("Paul");
    expect(markup).not.toContain("Fipsi");
  });
});
