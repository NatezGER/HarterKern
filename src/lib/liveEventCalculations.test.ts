import { describe, expect, it } from "vitest";
import {
  createLiveAttempt,
  finalizeLiveEvent,
  getActiveLiveEvent,
  getAttemptMilestones,
  getLiveStandings,
  getOfficialWorldRecord,
} from "@/lib/liveEventCalculations";
import type { LiveAttempt, LiveEvent, LiveParticipant } from "@/types/liveEvent";

const participant = (
  id: string,
  personalBest = 3,
  isAk = false,
  kind: LiveParticipant["kind"] = "permanent",
): LiveParticipant => ({
  id,
  name: id,
  kind,
  initials: id.slice(0, 2),
  avatarGradient: "",
  avatarUrl: null,
  personalBest,
  isAk,
});

const players = [
  participant("paul", 2.06),
  participant("mats", 2.4),
  participant("ak", 1.5, true),
  participant("guest", 0, false, "guest"),
];

const event: LiveEvent = {
  id: "event",
  name: "Test",
  date: "2026-07-27",
  startedAt: "2026-07-27T10:00:00.000Z",
  endsAt: "2026-07-28T10:00:00.000Z",
  status: "active",
  participantIds: players.map(({ id }) => id),
  createdBy: "management",
};

const attempt = (
  id: string,
  playerId: string,
  timeSeconds?: number,
  result: LiveAttempt["result"] = "time",
  outOfCompetition = false,
): LiveAttempt => ({
  id,
  playerId,
  eventId: event.id,
  result,
  timeSeconds: result === "time" ? timeSeconds : undefined,
  date: event.date,
  submittedAt: `2026-07-27T11:00:0${id}.000Z`,
  outOfCompetition,
});

describe("live event rules", () => {
  it("creates every entered time as an immediately official attempt", () => {
    expect(createLiveAttempt({
      playerId: "paul",
      eventId: event.id,
      result: "time",
      timeSeconds: 2.2,
      date: event.date,
      outOfCompetition: false,
    }, "1", event.startedAt)).toEqual({
      id: "1",
      playerId: "paul",
      eventId: event.id,
      eventName: undefined,
      result: "time",
      timeSeconds: 2.2,
      date: event.date,
      submittedAt: event.startedAt,
      outOfCompetition: false,
    });
  });

  it("supports an official standalone attempt without an event", () => {
    const created = createLiveAttempt({
      playerId: "paul",
      eventName: "Training",
      result: "time",
      timeSeconds: 2.2,
      date: event.date,
      outOfCompetition: false,
    }, "1", event.startedAt);
    expect(created).toMatchObject({ eventId: undefined, eventName: "Training" });
  });

  it("stores DNF without a time", () => {
    const created = createLiveAttempt({
      playerId: "paul",
      eventId: event.id,
      result: "dns",
      date: event.date,
      outOfCompetition: false,
    }, "1", event.startedAt);
    expect(created.timeSeconds).toBeUndefined();
  });

  it("orders standings by the fastest valid event time", () => {
    const standings = getLiveStandings(event, [
      attempt("1", "paul", 2.3),
      attempt("2", "mats", 2.2),
      attempt("3", "paul", 2.1),
    ], players);
    expect(standings.map(({ player }) => player.id)).toEqual(["paul", "mats", "ak", "guest"]);
    expect(standings[0]).toMatchObject({ rank: 1, bestTime: 2.1, averageTime: 2.2, attempts: 2 });
  });

  it("assigns the same rank to identical best times", () => {
    const standings = getLiveStandings(event, [
      attempt("1", "paul", 2.2),
      attempt("2", "mats", 2.2),
    ], players);
    expect(standings.slice(0, 3).map(({ rank }) => rank)).toEqual([1, 1, null]);
  });

  it("uses competition ranking for ties at first and second place", () => {
    const rankedPlayers = [
      participant("a"), participant("b"), participant("c"), participant("d"),
    ];
    const firstTie = getLiveStandings({ ...event, participantIds: rankedPlayers.map(({ id }) => id) }, [
      attempt("1", "a", 2.5), attempt("2", "b", 2.5), attempt("3", "c", 2.7),
    ], rankedPlayers);
    expect(firstTie.slice(0, 3).map(({ rank }) => rank)).toEqual([1, 1, 3]);

    const secondTie = getLiveStandings({ ...event, participantIds: rankedPlayers.map(({ id }) => id) }, [
      attempt("1", "a", 2.4), attempt("2", "b", 2.5),
      attempt("3", "c", 2.5), attempt("4", "d", 2.7),
    ], rankedPlayers);
    expect(secondTie.map(({ rank }) => rank)).toEqual([1, 2, 2, 4]);
  });

  it("keeps three identical times tied despite deterministic name ordering", () => {
    const rankedPlayers = [participant("c"), participant("a"), participant("b"), participant("d")];
    const standings = getLiveStandings(
      { ...event, participantIds: rankedPlayers.map(({ id }) => id) },
      [attempt("1", "c", 2.5), attempt("2", "a", 2.5),
        attempt("3", "b", 2.5), attempt("4", "d", 2.8)],
      rankedPlayers,
    );
    expect(standings.map(({ player }) => player.id)).toEqual(["a", "b", "c", "d"]);
    expect(standings.map(({ rank }) => rank)).toEqual([1, 1, 1, 4]);
  });

  it("lets an event-only guest rank and win without affecting official records", () => {
    const attempts = [
      attempt("1", "guest", 1.2),
      attempt("2", "paul", 2.2),
    ];
    expect(getLiveStandings(event, attempts, players).find(({ player }) => player.id === "guest")?.rank).toBe(1);
    expect(finalizeLiveEvent(event, attempts, players, "manual", event.endsAt).winnerPlayerId).toBe("guest");
    expect(getOfficialWorldRecord(players, attempts)).toBe(2.06);
  });

  it("recalculates a winner from the current attempts after edit or deletion", () => {
    const original = [attempt("1", "paul", 2.1), attempt("2", "mats", 2.2)];
    expect(finalizeLiveEvent(event, original, players, "manual", event.endsAt).winnerPlayerId).toBe("paul");
    const edited = original.map((item) => item.id === "1" ? { ...item, timeSeconds: 2.3 } : item);
    expect(finalizeLiveEvent(event, edited, players, "manual", event.endsAt).winnerPlayerId).toBe("mats");
    expect(finalizeLiveEvent(event, original.slice(1), players, "manual", event.endsAt).winnerPlayerId).toBe("mats");
  });

  it("does not persist an artificial single winner for a tied event", () => {
    const tied = [attempt("1", "paul", 2.2), attempt("2", "mats", 2.2)];
    expect(finalizeLiveEvent(event, tied, players, "manual", event.endsAt).winnerPlayerId)
      .toBeUndefined();
  });

  it("finalizes automatically and never finalizes twice", () => {
    const finished = finalizeLiveEvent(event, [], players, "automatic", event.endsAt);
    expect(finished).toMatchObject({
      status: "completed",
      endReason: "automatic",
      endedAt: event.endsAt,
    });
    expect(finalizeLiveEvent(finished, [], players, "manual", "later")).toBe(finished);
  });

  it("only exposes active events", () => {
    expect(getActiveLiveEvent([event])?.id).toBe(event.id);
    expect(getActiveLiveEvent([{ ...event, status: "completed" }])).toBeUndefined();
  });

  it("uses every valid regular attempt for the official world record", () => {
    expect(getOfficialWorldRecord(players, [
      attempt("1", "paul", 1.8),
      attempt("2", "ak", 1.1),
      attempt("3", "mats", 1.2, "time", true),
      attempt("4", "mats", undefined, "dns"),
    ])).toBe(1.8);
  });

  it("applies the same permanent-player eligibility to standings, WR and milestones", () => {
    const attempts = [
      attempt("1", "ak", 1.1),
      attempt("2", "mats", 1.2, "time", true),
      attempt("3", "paul", 1.9),
    ];
    const standings = getLiveStandings(event, attempts, players);
    expect(standings.find(({ player }) => player.id === "ak")?.bestTime).toBeNull();
    expect(standings.find(({ player }) => player.id === "mats")?.bestTime).toBeNull();
    expect(standings.find(({ player }) => player.id === "paul")?.bestTime).toBe(1.9);
    expect(getOfficialWorldRecord(players, attempts)).toBe(1.9);
    expect(getAttemptMilestones(players, attempts).get("1"))
      .toEqual({ isPersonalBest: false, isWorldRecord: false });
    expect(getAttemptMilestones(players, attempts).get("2"))
      .toEqual({ isPersonalBest: false, isWorldRecord: false });
    expect(getAttemptMilestones(players, attempts).get("3"))
      .toEqual({ isPersonalBest: true, isWorldRecord: true });
  });

  it("marks PB and WR milestones chronologically", () => {
    const baseline = [participant("paul", 3), participant("mats", 3.2)];
    const attempts = [
      attempt("1", "paul", 2.9),
      attempt("2", "mats", 3.1),
      attempt("3", "paul", 3.05),
    ];
    const milestones = getAttemptMilestones(baseline, attempts);
    expect(milestones.get("1")).toEqual({ isPersonalBest: true, isWorldRecord: true });
    expect(milestones.get("2")).toEqual({ isPersonalBest: true, isWorldRecord: false });
    expect(milestones.get("3")).toEqual({ isPersonalBest: false, isWorldRecord: false });
  });
});
