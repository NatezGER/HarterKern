import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgressionTimeline, type TimelinePoint } from "@/components/progression/ProgressionTimeline";

const point: TimelinePoint = {
  id: "pb-1",
  playerId: "11000000-0000-0000-0000-000000000002",
  playerName: "Paul",
  avatarUrl: "https://example.supabase.co/storage/v1/object/public/player-avatars/paul.webp",
  timeHundredths: 250,
  achievedAt: "2026-01-01T10:00:00.000Z",
  achievedDate: "2026-01-01",
  eventId: null,
  sourceLabel: "Testevent",
  improvementHundredths: null,
  durationDays: 1,
  isCurrent: true,
};

describe("ProgressionTimeline mobile history disclosure", () => {
  it("keeps the diagram and WR comparison available while details start collapsed", () => {
    const markup = renderToStaticMarkup(<ProgressionTimeline points={[point]} comparisonPoints={[{ ...point, id: "wr-1" }]} historyDisclosure={{ id: "personal-best-history", expanded: false }} />);
    expect(markup).toContain("data-progression-chart");
    expect(markup).toContain("Mit Weltrekord vergleichen");
    expect(markup).toContain('data-progression-history="collapsed"');
    expect(markup).toContain("grid-rows-[0fr]");
    expect(markup).toContain("sm:grid-rows-[1fr]");
  });

  it("renders the same details expanded when the local page state is toggled", () => {
    const markup = renderToStaticMarkup(<ProgressionTimeline points={[point]} historyDisclosure={{ id: "personal-best-history", expanded: true }} />);
    expect(markup).toContain('data-progression-history="expanded"');
    expect(markup).toContain("grid-rows-[1fr]");
    expect(markup).toContain("Paul");
  });

  it("labels the comparison as a season record in season mode", () => {
    const markup = renderToStaticMarkup(
      <ProgressionTimeline
        points={[point]}
        comparisonPoints={[{ ...point, id: "season-record-1" }]}
        comparisonLabel="Saisonrekord"
      />,
    );
    expect(markup).toContain("Mit Saisonrekord vergleichen");
    expect(markup).not.toContain("Mit Weltrekord vergleichen");
  });

  it("shows two differently dated player series together in compare mode", () => {
    const markup = renderToStaticMarkup(
      <ProgressionTimeline
        points={[point]}
        comparisonPoints={[{ ...point, id: "berta-pb", playerName: "Berta", achievedAt: "2026-02-01T10:00:00.000Z", achievedDate: "2026-02-01" }]}
        primaryLabel="Paul"
        comparisonLabel="Berta"
        comparisonInitiallyVisible
        compact
        showHistory={false}
        comparisonCrossoverIds={["berta-pb"]}
      />,
    );
    expect(markup).toContain("Paul");
    expect(markup).toContain("Berta");
    expect(markup).toContain("Nur Paul");
    expect(markup).toContain("min-w-0");
    expect(markup).toContain("data-progression-crossover");
    expect(markup).toContain("Führungswechsel");
    expect(markup).not.toContain("overflow-x-auto");
    expect(markup).not.toContain("data-progression-history");
  });
});
