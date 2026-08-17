import { describe, expect, it } from "vitest";
import { buildEventLeadProgression } from "@/lib/eventLeadProgression";
import { isEventEligibleLiveAttempt } from "@/lib/liveEventCalculations";
import {
  canPresentLiveLeaderboardTransition,
  completeLiveLeaderboardTransition,
  deriveLiveLeaderboardTransition,
  enqueueLiveLeaderboardTransition,
  getLiveLeaderboardMotion,
} from "@/lib/liveLeaderboardTransition";
import type {
  LiveAttempt,
  LiveEvent,
  LiveEventState,
  LiveParticipant,
} from "@/types/liveEvent";

const player = (
  id: string,
  name: string,
  changes: Partial<LiveParticipant> = {},
): LiveParticipant => ({
  id,
  name,
  kind: "permanent",
  initials: name.slice(0, 2),
  avatarGradient: "",
  avatarUrl: null,
  personalBest: 3,
  isAk: false,
  ...changes,
});

const event: LiveEvent = {
  id: "event",
  date: "2026-08-17",
  startedAt: "2026-08-17T10:00:00.000Z",
  endsAt: "2026-08-18T10:00:00.000Z",
  status: "active",
  participantIds: ["leader", "second", "third", "paul"],
  createdBy: "management",
};

const timedAttempt = (
  id: string,
  playerId: string,
  timeSeconds: number,
  minute: number,
  changes: Partial<LiveAttempt> = {},
): LiveAttempt => ({
  id,
  playerId,
  eventId: event.id,
  result: "time",
  timeSeconds,
  date: event.date,
  submittedAt: `2026-08-17T10:${String(minute).padStart(2, "0")}:00.000Z`,
  outOfCompetition: false,
  ...changes,
});

function stateWith(attempts: LiveAttempt[], players?: LiveParticipant[]): LiveEventState {
  return {
    version: 2,
    players: players ?? [
      player("leader", "Leader"),
      player("second", "Second"),
      player("third", "Third"),
      player("paul", "Paul"),
    ],
    events: [event],
    attempts,
    historicalAttempts: [],
  };
}

const baseline = [
  timedAttempt("a1", "leader", 2, 1),
  timedAttempt("a2", "second", 2.3, 2),
  timedAttempt("a3", "third", 2.5, 3),
  timedAttempt("a4", "paul", 3, 4),
];

describe("live leaderboard transition", () => {
  it("highlights a new best time without a rank change", () => {
    const transition = deriveLiveLeaderboardTransition({
      before: stateWith(baseline),
      event,
      attempt: timedAttempt("new", "paul", 2.8, 5),
    });
    expect(transition).toMatchObject({
      previousBestTime: 3,
      nextBestTime: 2.8,
      previousRank: 4,
      nextRank: 4,
      gainedPositions: 0,
      intensity: "best-time",
    });
  });

  it("distinguishes one and multiple gained positions", () => {
    const one = deriveLiveLeaderboardTransition({
      before: stateWith(baseline), event, attempt: timedAttempt("one", "paul", 2.4, 5),
    });
    const multiple = deriveLiveLeaderboardTransition({
      before: stateWith(baseline), event, attempt: timedAttempt("many", "paul", 2.1, 5),
    });
    expect(one).toMatchObject({ previousRank: 4, nextRank: 3, gainedPositions: 1, intensity: "position" });
    expect(multiple).toMatchObject({ previousRank: 4, nextRank: 2, gainedPositions: 2, intensity: "multi-position" });
  });

  it("marks a strict jump to first place as a new event lead", () => {
    const transition = deriveLiveLeaderboardTransition({
      before: stateWith(baseline), event, attempt: timedAttempt("lead", "paul", 1.9, 5),
    });
    expect(transition).toMatchObject({
      nextRank: 1,
      isNewEventBest: true,
      tookLead: true,
      intensity: "lead",
    });
    expect(transition?.beforeStandings[0].player.id).toBe("leader");
    expect(transition?.afterStandings[0].player.id).toBe("paul");
  });

  it("does not create changes for slower, DNF, AK or out-of-competition attempts", () => {
    const before = stateWith(baseline);
    expect(deriveLiveLeaderboardTransition({ before, event, attempt: timedAttempt("slow", "paul", 3.2, 5) })).toBeNull();
    expect(deriveLiveLeaderboardTransition({ before, event, attempt: {
      ...timedAttempt("dnf", "paul", 0, 5), result: "dns", timeSeconds: undefined,
    } })).toBeNull();
    const akState = stateWith(baseline, before.players.map((item) =>
      item.id === "paul" ? { ...item, isAk: true } : item));
    expect(deriveLiveLeaderboardTransition({ before: akState, event, attempt: timedAttempt("ak", "paul", 1.5, 5) })).toBeNull();
    expect(deriveLiveLeaderboardTransition({ before, event, attempt: timedAttempt("ooc", "paul", 1.5, 5, { outOfCompetition: true }) })).toBeNull();
  });

  it("allows guests in event standings without treating a tie as a new lead", () => {
    const guest = player("paul", "Zed", { kind: "guest", personalBest: 0 });
    const before = stateWith(baseline, stateWith([]).players.map((item) =>
      item.id === "paul" ? guest : item));
    const transition = deriveLiveLeaderboardTransition({
      before, event, attempt: timedAttempt("guest", "paul", 2, 5),
    });
    expect(transition).toMatchObject({ nextRank: 1, isNewEventBest: false, tookLead: false });
  });

  it("queues each attempt once and returns to the current state after completion", () => {
    const transition = deriveLiveLeaderboardTransition({
      before: stateWith(baseline), event, attempt: timedAttempt("new", "paul", 2.8, 5),
    })!;
    const queued = enqueueLiveLeaderboardTransition([], transition);
    expect(enqueueLiveLeaderboardTransition(queued, transition)).toBe(queued);
    expect(completeLiveLeaderboardTransition(queued)).toEqual([]);
  });

  it("waits for every P10C surface before presentation", () => {
    expect(canPresentLiveLeaderboardTransition({ hasPostAttempt: true, hasCelebration: false, hasBadgeUnlock: false, badgeLookupPending: false })).toBe(false);
    expect(canPresentLiveLeaderboardTransition({ hasPostAttempt: false, hasCelebration: true, hasBadgeUnlock: false, badgeLookupPending: false })).toBe(false);
    expect(canPresentLiveLeaderboardTransition({ hasPostAttempt: false, hasCelebration: false, hasBadgeUnlock: true, badgeLookupPending: false })).toBe(false);
    expect(canPresentLiveLeaderboardTransition({ hasPostAttempt: false, hasCelebration: false, hasBadgeUnlock: false, badgeLookupPending: true })).toBe(false);
    expect(canPresentLiveLeaderboardTransition({ hasPostAttempt: false, hasCelebration: false, hasBadgeUnlock: false, badgeLookupPending: false })).toBe(true);
  });

  it("adds the same strict new lead to standings and the central progression", () => {
    const before = stateWith(baseline);
    const newLead = timedAttempt("lead", "paul", 1.9, 5);
    const transition = deriveLiveLeaderboardTransition({ before, event, attempt: newLead });
    const progression = buildEventLeadProgression(
      [...before.attempts, newLead].map((attempt) => {
        const participant = before.players.find(({ id }) => id === attempt.playerId);
        return {
          id: attempt.id,
          playerId: attempt.playerId,
          guestId: null,
          name: participant?.name ?? "",
          avatarUrl: null,
          timeHundredths: attempt.timeSeconds == null ? null : Math.round(attempt.timeSeconds * 100),
          isDnf: attempt.result === "dns",
          isAk: !isEventEligibleLiveAttempt(attempt, participant),
          submittedAt: attempt.submittedAt,
          attemptNumber: 1,
        };
      }),
      null,
      "2026-08-17T11:00:00.000Z",
    );
    expect(transition?.tookLead).toBe(true);
    expect(progression.at(-1)?.id).toBe(newLead.id);
  });

  it("removes all motion durations for reduced motion", () => {
    expect(getLiveLeaderboardMotion(true)).toMatchObject({
      layoutDuration: 0,
      highlightDuration: 0,
    });
    expect(getLiveLeaderboardMotion(false).layoutDuration).toBeGreaterThan(0);
  });
});
