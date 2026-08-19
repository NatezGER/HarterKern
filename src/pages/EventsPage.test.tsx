import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Event } from "@/types";

const state = vi.hoisted(() => ({
  season: "all-time" as "all-time" | 2026,
  events: [] as Event[],
}));
vi.mock("@/hooks/useSeason", () => ({
  useSeason: () => ({ season: state.season, isAllTime: state.season === "all-time" }),
}));
vi.mock("@/hooks/useEffectivePublicData", () => ({
  useEffectivePublicData: () => ({ data: { events: state.events } }),
}));
vi.mock("@/components/common/DataState", () => ({
  DataState: ({ children }: { children: ReactNode }) => children,
}));

import { EventsPage } from "@/pages/EventsPage";

const event = (id: string, status: "active" | "closed" = "closed"): Event => ({
  id, title: `Event ${id}`, date: "2026-08-18", startedAt: "2026-08-18T18:00:00Z",
  endsAt: "2026-08-19T18:00:00Z", participantIds: ["p1", "p2"], attempts: 8,
  validAttempts: 7, dnfCount: 1, fastest: 2.8, average: 3.4, winnerNames: ["Paul"],
  status, awardsTrophies: false,
});

describe("EventsPage", () => {
  it("renders a real archive with tappable closed event cards", () => {
    state.season = "all-time";
    state.events = [event("closed"), event("active", "active")];
    const markup = render();
    expect(markup).toContain("Eventarchiv");
    expect(markup).toContain("Event closed");
    expect(markup).not.toContain("Event active");
    expect(markup).toContain('href="/events/closed"');
    expect(markup).not.toContain("Navigate");
  });

  it("shows the season context and its scoped empty state", () => {
    state.season = 2026;
    state.events = [];
    const markup = render();
    expect(markup).toContain("Saison 2026");
    expect(markup).toContain("Noch keine abgeschlossenen Events in Saison 2026.");
  });
});

function render() {
  return renderToStaticMarkup(<MemoryRouter><EventsPage /></MemoryRouter>);
}
