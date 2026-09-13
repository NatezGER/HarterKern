import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { EventDetail } from "@/types/historyProfiles";

vi.mock("@/hooks/useEffectivePublicData", () => ({
  useEffectivePublicData: () => ({ data: { players: [], leaderboard: [] } }),
}));

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
vi.mock("@/components/common/AwardAssetImage", () => ({
  AwardAssetImage: ({ assetId, alt }: { assetId: string; alt: string }) =>
    <span data-award-asset-id={assetId}>{alt}</span>,
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
  trophyCompetitionKey: null, trophyCompetitionYear: null,
  participants: 3, validAttempts: 3, dnfCount: 1, fastestHundredths: 300,
  averageHundredths: 350,
  podium: [],
  finalStandings: [
    { playerId: "player-1", guestId: null, name: "Paul", avatarUrl: "https://cdn.example/paul.webp",
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
  badges: [], photos: [], attemptNumbers: [], trophies: [], trophySpecialStats: null,
  extras: { loading: false, errors: {} },
};

const trophy = (
  placement: 1 | 2 | 3,
  playerId: string | null,
  guestId: string | null,
  playerName: string,
): EventDetail["trophies"][number] => ({
  key: `event-trophy:event-1:${playerId ?? `guest:${guestId}`}:${placement}`,
  competitionType: "event",
  scopeType: "event",
  competitionId: "event-1",
  seasonKey: null,
  competitionName: "Finale",
  year: 2026,
  eventDate: "2026-08-20",
  placement,
  tier: placement === 1 ? "gold" : placement === 2 ? "silver" : "bronze",
  competitionKey: "denmark",
  competitionYear: 2026,
  playerId,
  guestId,
  playerName,
  awardedAt: "2026-08-21T08:00:00Z",
});

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
    expect(markup).toContain('src="https://cdn.example/paul.webp"');
    const standings = markup.slice(markup.indexOf("Finale Bestenliste"),
      markup.indexOf("Event-Führungsprogression"));
    expect(standings.match(/>1\.<\/span>/g)?.length).toBe(2);
    expect(markup).toContain("DNF");
    expect(markup.indexOf("Podium")).toBeLessThan(markup.indexOf("Finale Bestenliste"));
  });

  it("labels Denmark from structured competition metadata", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><EventResults detail={{
        ...detail,
        awardsTrophies: true,
        trophyCompetitionKey: "denmark",
        trophyCompetitionYear: 2026,
      }} /></MemoryRouter>,
    );
    expect(markup).toContain("Trophäen-Event");
    expect(markup).toContain("Dänemark 2026");
  });

  it("keeps the regular podium for a normal event", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><EventResults detail={{
        ...detail,
        podium: [detail.finalStandings[0]],
      }} /></MemoryRouter>,
    );
    expect(markup).toContain(">Podium</h2>");
    expect(markup).not.toContain("Trophäen-Podium");
    expect(markup).not.toContain("data-event-trophy-podium");
  });

  it("replaces the regular podium with the competition trophy podium", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><EventResults detail={{
        ...detail,
        awardsTrophies: true,
        trophyCompetitionKey: "denmark",
        trophyCompetitionYear: 2026,
        podium: [],
        trophies: [
          trophy(1, "player-1", null, "Paul"),
          trophy(3, null, "guest-1", "Gast"),
          trophy(2, "player-2", null, "Lars"),
        ],
        extras: { loading: false, errors: {} },
      }} /></MemoryRouter>,
    );
    expect(markup).toContain("Trophäen-Podium");
    expect(markup).toContain("data-event-trophy-podium");
    expect(markup).not.toContain("Keine gültige Eventzeit vorhanden");
    expect(markup).not.toContain("Vergebene Trophäen");

    const silver = markup.indexOf("Lars, 2. Platz");
    const gold = markup.indexOf("Paul, 1. Platz");
    const bronze = markup.indexOf("Gast, 3. Platz");
    expect(silver).toBeGreaterThan(-1);
    expect(silver).toBeLessThan(gold);
    expect(gold).toBeLessThan(bronze);
    expect(markup).toContain('data-award-asset-id="trophy:denmark:2026:silver"');
    expect(markup).toContain('data-award-asset-id="trophy:denmark:2026:gold"');
    expect(markup).toContain('data-award-asset-id="trophy:denmark:2026:bronze"');
    expect(markup).toContain("2,50 s");
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("sm:grid-cols-3");
    expect(markup).toContain("order-1");
    expect(markup).toContain("sm:order-2");
  });

  it("shows historical Trophy special stats after the final standings", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><EventResults detail={{
        ...detail,
        awardsTrophies: true,
        trophyCompetitionKey: "denmark",
        trophyCompetitionYear: 2026,
        trophySpecialStats: {
          eventId: detail.id,
          eventName: detail.name,
          mostWanted: {
            endings: [], reached: 1, total: 100, percent: 1, openEndings: [],
            mostCommonEnding: 42, mostCommonHits: 2, rarestAchievedEndings: [42],
            topHunters: [],
          },
          metrics: {
            bingoLines: 0, distinctEndings: 1, snapEndings: 0,
            matchingTimeParticipantCount: 1, matchingTimeHundredths: 342,
            matchingTimeParticipantNames: ["Paul"], validAttempts: 2,
            mostCommonEnding: 42, mostCommonEndingHits: 2,
          },
        },
        extras: { loading: false, errors: {} },
      }} /></MemoryRouter>,
    );
    expect(markup).toContain("data-trophy-event-special-stats");
    expect(markup).toContain("Event-Meilensteine");
    expect(markup.indexOf("Finale Bestenliste"))
      .toBeLessThan(markup.indexOf("Event-Jagd"));
  });

  it("does not show special stats for a normal event", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter><EventResults detail={detail} /></MemoryRouter>,
    );
    expect(markup).not.toContain("data-trophy-event-special-stats");
    expect(markup).not.toContain("Event-Meilensteine");
  });
});
