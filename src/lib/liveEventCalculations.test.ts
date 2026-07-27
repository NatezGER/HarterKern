import { describe, expect, it } from "vitest";
import {
  createLiveAttempt,
  finalizeLiveEvent,
  getActiveLiveEvent,
  getLiveStandings,
  getOfficialWorldRecord,
  isApproved,
  moderateLiveAttempt,
} from "@/lib/liveEventCalculations";
import type { LiveAttempt, LiveEvent, LiveParticipant } from "@/types/liveEvent";

const player = (id: string, pb = 3, isAk = false): LiveParticipant => ({
  id,
  name: id,
  initials: id.slice(0, 2),
  avatarGradient: "",
  avatarUrl: null,
  personalBest: pb,
  isAk,
});
const players = [player("paul", 2.06), player("mats", 2.4), player("ak", 1.5, true)];
const event: LiveEvent = {
  id: "event",
  name: "Test",
  date: "2026-07-27",
  startedAt: "2026-07-27T10:00:00.000Z",
  endsAt: "2026-07-28T10:00:00.000Z",
  status: "active",
  participantIds: players.map(({ id }) => id),
  participants: players,
  createdBy: "admin",
};
const attempt = (
  id: string,
  playerId: string,
  timeSeconds: number | undefined,
  status: LiveAttempt["status"],
  result: LiveAttempt["result"] = "time",
): LiveAttempt => ({
  id,
  playerId,
  eventId: event.id,
  result,
  timeSeconds,
  status,
  submittedAt: "2026-07-27T11:00:00.000Z",
  submittedBy: "test",
  submittedByRole: status === "approved" ? "admin" : "user",
});

describe("live event rules", () => {
  it("approves admin attempts immediately", () => {
    const created = createLiveAttempt({ id: "1", eventId: event.id, player: players[0], result: "time", timeSeconds: 2.2, role: "admin", now: event.startedAt });
    expect(created.status).toBe("approved");
  });
  it("stores user attempts as pending", () => {
    const created = createLiveAttempt({ id: "1", eventId: event.id, player: players[0], result: "time", timeSeconds: 2.2, role: "user", now: event.startedAt });
    expect(created.status).toBe("pending");
  });
  it("does not treat pending attempts as globally approved", () => {
    expect(isApproved(attempt("1", "paul", 1.9, "pending"))).toBe(false);
  });
  it("includes pending attempts provisionally in live standings", () => {
    expect(getLiveStandings(event, [attempt("1", "paul", 1.9, "pending")])[0].bestTime).toBe(1.9);
  });
  it("approves an attempt exactly once", () => {
    const approved = moderateLiveAttempt(attempt("1", "paul", 2.2, "pending"), "approved", event.startedAt);
    expect(moderateLiveAttempt(approved, "approved", event.endsAt)).toBe(approved);
  });
  it("removes rejected attempts from live standings", () => {
    expect(getLiveStandings(event, [attempt("1", "paul", 1.9, "rejected")])[0].bestTime).toBeNull();
  });
  it("selects the fastest approved regular player as winner", () => {
    const finished = finalizeLiveEvent(event, [attempt("1", "paul", 2.2, "approved"), attempt("2", "mats", 2.3, "approved")], "manual", event.endsAt);
    expect(finished.winnerPlayerId).toBe("paul");
  });
  it("stores DNS without a time", () => {
    const dns = createLiveAttempt({ id: "1", eventId: event.id, player: players[0], result: "dns", role: "admin", now: event.startedAt });
    expect(dns.timeSeconds).toBeUndefined();
  });
  it("finalizes automatically at the 24-hour endpoint", () => {
    expect(finalizeLiveEvent(event, [], "automatic", event.endsAt)).toMatchObject({ status: "completed", endReason: "automatic", endedAt: event.endsAt });
  });
  it("does not finalize an event twice", () => {
    const finished = finalizeLiveEvent(event, [], "manual", event.endsAt);
    expect(finalizeLiveEvent(finished, [], "automatic", "later")).toBe(finished);
  });
  it("exposes an active event only while it is live", () => {
    expect(getActiveLiveEvent([event])?.id).toBe(event.id);
    expect(getActiveLiveEvent([{ ...event, status: "completed" }])).toBeUndefined();
  });
  it("treats historical attempts without status as approved", () => {
    expect(isApproved({ ...attempt("1", "paul", 2.2, undefined), status: undefined })).toBe(true);
  });
  it("updates the world record only after approval", () => {
    const pending = attempt("1", "paul", 1.8, "pending");
    expect(getOfficialWorldRecord(players, [pending])).toBe(2.06);
    expect(getOfficialWorldRecord(players, [{ ...pending, status: "approved" }])).toBe(1.8);
  });
  it("allows manual completion while attempts are pending", () => {
    expect(finalizeLiveEvent(event, [attempt("1", "paul", 1.9, "pending")], "manual", event.endsAt).status).toBe("completed");
  });
});
