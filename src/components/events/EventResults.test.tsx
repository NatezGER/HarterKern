import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { EventDetail } from "@/types/historyProfiles";

vi.mock("@/components/progression/ProgressionTimeline", () => ({
  ProgressionTimeline: ({ domainStartAt, domainEndAt }: {
    domainStartAt?: string; domainEndAt?: string;
  }) => <div data-timeline-start={domainStartAt} data-timeline-end={domainEndAt}>Timeline</div>,
}));
vi.mock("@/components/events/EventAttemptNumberChart", () => ({
  EventAttemptNumberChart: () => <div>Versuchsnummern-Inhalt</div>,
}));
vi.mock("@/components/events/EventAttemptList", () => ({
  EventAttemptList: () => <div>Alle Versuche Inhalt</div>,
}));

import { EventResults } from "@/components/events/EventResults";

const attempt = (id: string, submittedAt: string, timeHundredths: number | null,
  isDnf = false) => ({ id, playerId: id, guestId: null, name: id,
    avatarUrl: null, isGuest: false, isAk: false, timeHundredths, isDnf,
    submittedAt, attemptNumber: 1, rank: 1, isPb: true, isWr: false, isEb: true });

const detail: EventDetail = {
  id: "event-1", name: "Finale", date: "2026-08-20",
  startedAt: "2026-08-20T18:00:00Z", closedAt: "2026-08-21T08:00:00Z",
  status: "closed", description: null, isImportant: false, awardsTrophies: false,
  participants: 3, validAttempts: 3, dnfCount: 1, fastestHundredths: 300,
  averageHundredths: 350,
  podium: [],
  finalStandings: [
    { playerId: "player-1", guestId: null, name: "Paul", avatarUrl: null,
      isGuest: false, isAk: false, attempts: 2, validAttempts: 2, dnfCount: 0,
      bestHundredths: 250, averageHundredths: 275, rank: 1,
      leadSeconds: 0, eventBestBreaks: 0 },
    { playerId: "player-2", guestId: null, name: "Lars", avatarUrl: null,
      isGuest: false, isAk: false, attempts: 1, validAttempts: 1, dnfCount: 0,
      bestHundredths: 250, averageHundredths: 250, rank: 1,
      leadSeconds: 0, eventBestBreaks: 0 },
    { playerId: null, guestId: "guest-1", name: "Gast", avatarUrl: null,
      isGuest: true, isAk: false, attempts: 1, validAttempts: 0, dnfCount: 1,
      bestHundredths: null, averageHundredths: null, rank: null,
      leadSeconds: 0, eventBestBreaks: 0 },
  ],
  participantStats: [],
  attempts: [
    attempt("player-1", "2026-08-20T18:59:00Z", 400),
    attempt("player-2", "2026-08-20T19:06:00Z", 350),
    attempt("player-3", "2026-08-20T23:10:00Z", 300),
    attempt("dnf", "2026-08-21T01:00:00Z", null, true),
  ],
  badges: [], photos: [], attemptNumbers: [], trophies: [],
  extras: { loading: false, errors: {} },
};

describe("EventResults polish", () => {
  it("uses valid-attempt visual bounds, omits photos and keeps attempts last", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><EventResults detail={detail} /></MemoryRouter>,
    );
    expect(markup).toContain('data-timeline-start="2026-08-20T18:59:00Z"');
    expect(markup).toContain('data-timeline-end="2026-08-20T23:10:00Z"');
    expect(markup).not.toContain(detail.closedAt ?? "");
    expect(markup).not.toContain("Eventfotos");
    expect(markup.indexOf("Versuchsnummern-Inhalt"))
      .toBeLessThan(markup.indexOf("Alle Versuche Inhalt"));
  });

  it("shows the complete final standings directly after the retained podium", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><EventResults detail={detail} /></MemoryRouter>,
    );
    expect(markup).toContain("Finale Bestenliste");
    expect(markup).toContain("Paul");
    expect(markup).toContain("Lars");
    expect(markup).toContain("Gast");
    const standings = markup.slice(markup.indexOf("Finale Bestenliste"),
      markup.indexOf("Event-Führungsprogression"));
    expect(standings.match(/>1\.<\/span>/g)?.length).toBe(2);
    expect(markup).toContain("DNF");
    expect(markup.indexOf("Podium")).toBeLessThan(markup.indexOf("Finale Bestenliste"));
  });
});
