import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveAttempt, LiveEvent, LiveEventState } from "@/types/liveEvent";

const mocks = vi.hoisted(() => ({ unlocked: true }));

vi.mock("@/hooks/useManagementMode", () => ({
  useManagementMode: () => ({ unlocked: mocks.unlocked }),
}));
vi.mock("@/hooks/useLiveEvent", () => ({
  useLiveEvent: () => ({ state }),
}));
vi.mock("@/components/management/AttemptEditDialog", () => ({
  AttemptEditDialog: () => null,
}));

import { AttemptHistory } from "@/components/events/AttemptHistory";

const event: LiveEvent = {
  id: "event-1",
  name: "Live",
  date: "2026-09-14",
  startedAt: "2026-09-14T18:00:00Z",
  endsAt: "2026-09-14T22:00:00Z",
  status: "active",
  participantIds: ["player-1"],
  createdBy: "admin",
};
const attempt: LiveAttempt = {
  id: "attempt-1",
  playerId: "player-1",
  eventId: event.id,
  result: "time",
  timeSeconds: 3.21,
  date: event.date,
  submittedAt: "2026-09-14T18:01:00Z",
  outOfCompetition: false,
};
const state: LiveEventState = {
  version: 2,
  players: [{
    id: "player-1", name: "Paul", kind: "permanent", initials: "P",
    avatarGradient: "", avatarUrl: null, personalBest: 3.5, isAk: false,
  }],
  events: [event],
  attempts: [attempt],
  historicalAttempts: [],
};

describe("AttemptHistory mobile editing", () => {
  beforeEach(() => { mocks.unlocked = true; });

  it("shows a touch-sized edit action without hiding it below desktop", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><AttemptHistory event={event} attempts={[attempt]} /></MemoryRouter>,
    );
    expect(markup).toContain('aria-label="Paul: Versuch bearbeiten"');
    expect(markup).toContain("size-11");
    expect(markup).not.toContain("hidden lg:inline-flex");
    expect(markup).toContain('<span class="hidden lg:inline">Bearbeiten</span>');
  });

  it("does not expose editing to viewers", () => {
    mocks.unlocked = false;
    const markup = renderToStaticMarkup(
      <MemoryRouter><AttemptHistory event={event} attempts={[attempt]} /></MemoryRouter>,
    );
    expect(markup).not.toContain("Versuch bearbeiten");
  });
});
