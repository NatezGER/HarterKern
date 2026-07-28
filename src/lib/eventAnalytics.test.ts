import { describe, expect, it } from "vitest";
import { getEventAnalytics } from "@/lib/eventAnalytics";
import { sortStandingsForEntry } from "@/lib/liveEventCalculations";
import type { LiveAttempt, LiveEvent, LiveParticipant } from "@/types/liveEvent";

const participants: LiveParticipant[] = [
  {
    id: "player",
    name: "Paul",
    kind: "permanent",
    initials: "PA",
    avatarGradient: "",
    avatarUrl: null,
    personalBest: 0,
    isAk: false,
  },
  {
    id: "guest",
    name: "Anna",
    kind: "guest",
    eventId: "event",
    initials: "AN",
    avatarGradient: "",
    avatarUrl: null,
    personalBest: 0,
    isAk: false,
  },
];
const event: LiveEvent = {
  id: "event",
  name: "Dänemark 2026",
  date: "2026-07-28",
  startedAt: "2026-07-28T10:00:00.000Z",
  endsAt: "2026-07-29T10:00:00.000Z",
  status: "completed",
  participantIds: ["player", "guest"],
  createdBy: "Supabase",
};
const attempts: LiveAttempt[] = [
  {
    id: "a1",
    playerId: "player",
    participantKind: "permanent",
    eventId: "event",
    result: "time",
    timeSeconds: 2,
    date: "2026-07-28",
    submittedAt: "2026-07-28T10:01:00.000Z",
    outOfCompetition: false,
  },
  {
    id: "a2",
    playerId: "guest",
    participantKind: "guest",
    eventId: "event",
    result: "time",
    timeSeconds: 3,
    date: "2026-07-28",
    submittedAt: "2026-07-28T10:02:00.000Z",
    outOfCompetition: false,
  },
];

describe("event analytics", () => {
  it("counts guests fully inside the event and calculates median", () => {
    const result = getEventAnalytics(event, attempts, participants);
    expect(result.guestCount).toBe(1);
    expect(result.validAttempts).toBe(2);
    expect(result.medianTime).toBe(2.5);
    expect(result.standings.map(({ rank }) => rank)).toEqual([1, 2]);
  });

  it("sorts time-entry cards by fewest attempts and then alphabetically", () => {
    const result = getEventAnalytics(event, attempts.slice(0, 1), participants);
    expect(sortStandingsForEntry(result.standings).map(({ player }) => player.name))
      .toEqual(["Anna", "Paul"]);
  });
});
