import { describe, expect, it } from "vitest";
import { getAttemptClockLabel, sortEventAttempts } from "@/lib/historyProfiles";
import type { EventAttemptDetail } from "@/types/historyProfiles";

const attempt = (
  id: string,
  timeHundredths: number | null,
  isDnf: boolean,
  submittedAt: string,
): EventAttemptDetail => ({
  id,
  playerId: "10000000-0000-0000-0000-000000000001",
  guestId: null,
  name: "Paul",
  avatarUrl: null,
  isGuest: false,
  isAk: false,
  timeHundredths,
  isDnf,
  submittedAt,
  attemptNumber: 1,
  rank: 1,
  isPb: false,
  isWr: false,
  isEb: false,
});

describe("event attempt presentation", () => {
  it("puts DNF after valid attempts when sorting by best time", () => {
    const rows = [
      attempt("c", null, true, "2026-07-30T20:00:00Z"),
      attempt("b", 300, false, "2026-07-30T19:00:00Z"),
      attempt("a", 206, false, "2026-07-30T21:00:00Z"),
    ];
    expect(sortEventAttempts(rows, "best").map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("uses timestamp and id for a stable tie order", () => {
    const rows = [
      attempt("b", 206, false, "2026-07-30T20:00:00Z"),
      attempt("a", 206, false, "2026-07-30T20:00:00Z"),
    ];
    expect(sortEventAttempts(rows, "best").map(({ id }) => id)).toEqual(["a", "b"]);
    expect(sortEventAttempts(rows, "chronological").map(({ id }) => id)).toEqual(["a", "b"]);
  });

  it("preserves attempt order when clock information is identical or absent", () => {
    const identical = [
      { ...attempt("b", 206, false, "2026-07-30T20:00:00Z"), attemptNumber: 2 },
      { ...attempt("a", 206, false, "2026-07-30T20:00:00Z"), attemptNumber: 1 },
    ];
    const missing = identical.map((row) => ({ ...row, submittedAt: "" }));
    expect(sortEventAttempts(identical, "chronological").map(({ id }) => id))
      .toEqual(["a", "b"]);
    expect(sortEventAttempts(missing, "chronological").map(({ id }) => id))
      .toEqual(["a", "b"]);
    expect(getAttemptClockLabel("")).toBeNull();
    expect(getAttemptClockLabel("2026-07-30")).toBeNull();
  });
});
