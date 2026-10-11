import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LiveLeaderboard } from "./LiveLeaderboard";
import type { LiveStanding } from "@/types/liveEvent";

describe("live valid-attempt display", () => {
  it("shows the existing valid count for players and guests, not all starts", () => {
    const standings: LiveStanding[] = (["permanent", "guest"] as const).map((kind, index) => ({
      player: { id: kind, kind, name: kind, initials: "AB", avatarGradient: "",
        avatarUrl: null, personalBest: 3, isAk: false },
      rank: index + 1, bestTime: 3, averageTime: 3, attempts: 3, validAttempts: 2,
      lastAttempt: undefined,
    }));
    const html = renderToStaticMarkup(<MemoryRouter><LiveLeaderboard standings={standings} /></MemoryRouter>);
    expect(html.match(/2 gültige Versuche/g)).toHaveLength(2);
    expect(html).not.toContain("3 gültige Versuche");
    expect(html).not.toContain('href="/player/guest"');
  });
});
