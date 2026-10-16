import { describe, expect, it } from "vitest";
import { visibleSweetSpot } from "./sweetSpot";
import type { LiveAttempt, LiveParticipant } from "@/types/liveEvent";
const player: LiveParticipant = { id: "p", name: "P", kind: "permanent",
  initials: "P", avatarGradient: "", avatarUrl: null, personalBest: 2, isAk: false };
const spot = { attemptNumber: 5, averageHundredths: 236, samples: 1, nextAttemptNumber: 5 };
const attempt = (id: number, patch: Partial<LiveAttempt> = {}): LiveAttempt => ({
  id: String(id), eventId: "e", playerId: "p", result: "time", timeSeconds: 3,
  date: "2026-10-16", submittedAt: "2026-10-16T12:00:00Z", outOfCompetition: false, ...patch,
});
describe("Sweet Spot live visibility", () => {
  it("shows #5 after four relevant attempts even with only one sample", () => {
    expect(visibleSweetSpot(player, "e", [1,2,3,4].map(n => attempt(n)), spot)).toEqual(spot);
  });
  it("hides immediately after #5 and on all nonmatching next ordinals", () => {
    for (const count of [0,1,2,3,5,6]) expect(visibleSweetSpot(player, "e",
      Array.from({ length: count }, (_, i) => attempt(i)), spot)).toBeNull();
  });
  it("counts DNF as an ordinal, excludes AK, other players and other events, independent of ordering", () => {
    const attempts = [attempt(4), attempt(2, { result: "dns", timeSeconds: undefined }),
      attempt(1), attempt(3), attempt(5, { outOfCompetition: true }),
      attempt(6, { eventId: "old" }), attempt(7, { playerId: "other" })];
    expect(visibleSweetSpot(player, "e", attempts, spot)).toEqual(spot);
    expect(visibleSweetSpot(player, "e", [...attempts, attempt(8, { result: "dns" })], spot)).toBeNull();
  });
  it("never serves guests, AK players, missing data or mismatched server ordinals", () => {
    const attempts = [1,2,3,4].map(n => attempt(n));
    expect(visibleSweetSpot({ ...player, kind: "guest" }, "e", attempts, spot)).toBeNull();
    expect(visibleSweetSpot({ ...player, isAk: true }, "e", attempts, spot)).toBeNull();
    expect(visibleSweetSpot(player, "e", attempts, undefined)).toBeNull();
    expect(visibleSweetSpot(player, "e", attempts, { ...spot, nextAttemptNumber: 6 })).toBeNull();
  });
  it("allows simultaneous incoming spots and re-evaluates after delete or AK edits", () => {
    const attempts = [1,2,3,4].map(n => attempt(n));
    const other = { ...player, id: "other" };
    const all = [...attempts, ...attempts.map(a => ({ ...a, id: "other-"+a.id, playerId: other.id }))];
    expect(visibleSweetSpot(player, "e", all, spot)).toEqual(spot);
    expect(visibleSweetSpot(other, "e", all, spot)).toEqual(spot);
    expect(visibleSweetSpot(player, "e", attempts.slice(1), spot)).toBeNull();
    expect(visibleSweetSpot(player, "e", attempts.map((a,i) => i ? a : { ...a, outOfCompetition: true }), spot)).toBeNull();
  });
});
