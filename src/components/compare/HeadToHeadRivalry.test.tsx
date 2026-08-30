import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HeadToHeadSection } from "@/components/compare/HeadToHeadSection";
import type { HeadToHeadSummary } from "@/types/historyProfiles";

const event = (id: string, rivalry: boolean) => ({ eventId: id, eventName: id, eventDate: "2026-08-30", playerATimeHundredths: 242, playerBTimeHundredths: 250, winner: "a" as const, differenceHundredths: 8, isRivalryEvent: rivalry, directTakeovers: rivalry ? 3 : 0 });
const data: HeadToHeadSummary = { playerAWins: 2, playerBWins: 0, ties: 0, totalDuels: 2,
  events: [event("pair-rivalry", true), event("normal-event", false)], closestDuel: event("pair-rivalry", true), biggestWin: event("normal-event", false), currentStreak: null, longestStreak: null,
  rivalry: { commonEvents: 2, rivalryEvents: 1, directTakeovers: 3, firstRivalryDate: "2026-08-30", lastRivalryDate: "2026-08-30" } };

describe("HeadToHead rivalry presentation", () => {
  it("shows the pair summary and marks only its qualifying event", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><HeadToHeadSection playerAName="Paul" playerBName="Lars" data={data} loading={false} error="" /></MemoryRouter>);
    expect(markup).toContain("Rivalitäts-Events"); expect(markup).toContain("Rivalitäts-Event · 3 Wechsel");
    expect(markup.match(/Rivalitäts-Event · 3 Wechsel/g)).toHaveLength(1);
    expect(markup).toContain("normal-event");
    expect(markup).not.toContain("border-red-400/25");
    expect(markup).not.toContain("bg-red-400/[0.035]");
    expect(markup).not.toContain("shadow-[inset_3px_0_0_rgba(248,113,113,0.45)]");
  });
});
