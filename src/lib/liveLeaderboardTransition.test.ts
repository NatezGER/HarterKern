import { describe, expect, it } from "vitest";
import { buildEventLeadProgression } from "@/lib/eventLeadProgression";
import { isEventEligibleLiveAttempt } from "@/lib/liveEventCalculations";
import {
  canPresentLiveLeaderboardTransition,
  advanceLeaderboardPresentation,
  completeLiveLeaderboardTransition,
  deriveLiveLeaderboardTransition,
  enqueueLiveLeaderboardTransition,
  getLiveLeaderboardMotion,
  getLeaderboardPresentationSettings,
  isLeaderboardAnimationReady,
  startLeaderboardScroll,
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
    expect(getLeaderboardPresentationSettings(true)).toEqual({
      behavior: "auto",
      fallbackTimeout: 0,
    });
    expect(getLeaderboardPresentationSettings(false).behavior).toBe("smooth");
  });

  it("scrolls only after P10C and animates only after scrolling", () => {
    expect(advanceLeaderboardPresentation("waiting", "scroll-complete")).toBe("waiting");
    const scrolling = advanceLeaderboardPresentation("waiting", "p10c-complete");
    expect(scrolling).toBe("scrolling");
    expect(isLeaderboardAnimationReady({
      transitionReady: true,
      transitionAttemptId: "attempt",
      presentationAttemptId: "attempt",
      stage: scrolling,
    })).toBe(false);
    const animating = advanceLeaderboardPresentation(scrolling, "scroll-complete");
    expect(isLeaderboardAnimationReady({
      transitionReady: true,
      transitionAttemptId: "attempt",
      presentationAttemptId: "attempt",
      stage: animating,
    })).toBe(true);
    expect(advanceLeaderboardPresentation(animating, "animation-complete")).toBe("complete");
    expect(advanceLeaderboardPresentation("complete", "reset")).toBe("waiting");
  });

  it("does not finish scrolling before the leaderboard reaches its target", () => {
    const harness = createScrollHarness();
    let completed = false;
    startLeaderboardScroll(harness.target, false, () => { completed = true; }, harness.runtime);
    harness.runFrame();
    expect(completed).toBe(false);
    harness.sample.top = 112;
    harness.sample.bottom = 512;
    harness.sample.scrollY = 788;
    harness.runFrame();
    expect(completed).toBe(false);
    harness.runFrame();
    expect(completed).toBe(true);
  });

  it("uses the safety fallback when the browser never reports a settled position", () => {
    const harness = createScrollHarness();
    let completed = false;
    startLeaderboardScroll(harness.target, false, () => { completed = true; }, harness.runtime);
    harness.runFrame();
    expect(completed).toBe(false);
    harness.runFallback();
    expect(completed).toBe(true);
  });

  it("uses a direct focused scroll for reduced motion", () => {
    const calls: ScrollIntoViewOptions[] = [];
    const target = {
      scrollIntoView: (options?: boolean | ScrollIntoViewOptions) => {
        if (typeof options === "object") calls.push(options);
      },
      getBoundingClientRect: () => ({}) as DOMRect,
    };
    let completed = false;
    startLeaderboardScroll(target as unknown as Element, true, () => { completed = true; });
    expect(calls).toEqual([{ behavior: "auto", block: "start" }]);
    expect(completed).toBe(true);
  });
});

function createScrollHarness() {
  let nextHandle = 1;
  const frames = new Map<number, FrameRequestCallback>();
  const fallbacks = new Map<number, () => void>();
  const sample = {
    top: 900,
    bottom: 1_300,
    height: 400,
    scrollY: 0,
    viewportHeight: 800,
    scrollMarginTop: 112,
  };
  const target = {
    scrollIntoView: () => undefined,
    getBoundingClientRect: () => ({}) as DOMRect,
  };
  const runtime = {
    requestFrame: (callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      frames.set(handle, callback);
      return handle;
    },
    cancelFrame: (handle: number) => { frames.delete(handle); },
    setFallback: (callback: () => void) => {
      const handle = nextHandle++;
      fallbacks.set(handle, callback);
      return handle;
    },
    clearFallback: (handle: number) => { fallbacks.delete(handle); },
    read: () => ({ ...sample }),
  };
  return {
    target: target as unknown as Element,
    runtime,
    sample,
    runFrame: () => {
      const entry = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!entry) return;
      frames.delete(entry[0]);
      entry[1](0);
    },
    runFallback: () => {
      const entry = fallbacks.entries().next().value as [number, () => void] | undefined;
      if (!entry) return;
      fallbacks.delete(entry[0]);
      entry[1]();
    },
  };
}
