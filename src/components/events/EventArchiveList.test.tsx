import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Event } from "@/types";

vi.mock("@/components/common/AwardAssetImage", () => ({
  AwardAssetImage: ({ assetId, alt, className }: {
    assetId: string; alt: string; className: string;
  }) => <img data-asset-id={assetId} alt={alt} className={className} />,
}));

import { EventArchiveList } from "@/components/events/EventArchiveList";

const event = (changes: Partial<Event> = {}): Event => ({
  id: "event-1", title: "Spieleabend", date: "2026-09-05",
  startedAt: "2026-09-05T18:00:00Z", endsAt: "2026-09-06T18:00:00Z",
  participantIds: ["p1"], attempts: 3, validAttempts: 3, dnfCount: 0,
  fastest: 3.42, average: 3.8, winnerNames: ["Paul"], status: "closed",
  awardsTrophies: false, trophyCompetitionKey: null, trophyCompetitionYear: null,
  ...changes,
});

const render = (value: Event) => renderToStaticMarkup(
  <MemoryRouter><EventArchiveList events={[value]} emptyLabel="Leer" /></MemoryRouter>,
);

describe("Event archive Trophy marker", () => {
  it("does not mark normal events", () => {
    const markup = render(event());
    expect(markup).not.toContain("data-asset-id");
    expect(markup).toContain('data-event-theme="default"');
    expect(markup).not.toContain("denmark-decoration");
  });

  it("shows the competition gold asset immediately after the Trophy Event name", () => {
    const markup = render(event({
      awardsTrophies: true,
      trophyCompetitionKey: "denmark",
      trophyCompetitionYear: 2026,
    }));
    expect(markup).toContain('data-asset-id="trophy:denmark:2026:gold"');
    expect(markup).toContain("Trophy Event · Dänemark 2026");
    expect(markup).toContain('data-event-theme="denmark"');
    expect(markup).toContain("denmark-archive-card");
    expect(markup).toContain("denmark-decoration");
    expect(markup.indexOf("Spieleabend")).toBeLessThan(markup.indexOf("data-asset-id"));
  });

  it("does not invent an asset for a Trophy Event without a competition", () => {
    expect(render(event({ awardsTrophies: true }))).not.toContain("data-asset-id");
  });

  it("keeps the established card padding while the marker spans both text rows", () => {
    const markup = render(event({
      awardsTrophies: true,
      trophyCompetitionKey: "denmark",
      trophyCompetitionYear: 2026,
    }));
    expect(markup).toContain("sm:items-center sm:gap-7");
    expect(markup).toContain("overflow-hidden p-5");
    expect(markup).toContain("grid-rows-[auto_auto]");
    expect(markup).toContain("row-span-2");
    expect(markup).toContain("visible");
    expect(markup).toContain("size-11 max-w-none shrink-0 self-center sm:size-12");
  });

  it.each([360, 390, 430])("keeps the Trophy asset visible and fixed-size at %ipx", () => {
    const markup = render(event({
      awardsTrophies: true,
      trophyCompetitionKey: "denmark",
      trophyCompetitionYear: 2026,
    }));
    expect(markup).toContain("visible");
    expect(markup).toContain("size-11");
    expect(markup).toContain("sm:size-12");
    expect(markup).toContain("shrink-0");
  });
});
