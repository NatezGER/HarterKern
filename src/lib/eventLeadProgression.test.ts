import { describe, expect, it } from "vitest";
import { buildEventLeadProgression, formatLeadDuration } from "@/lib/eventLeadProgression";

const attempt = (id: string, timeHundredths: number | null, submittedAt: string, changes = {}) => ({ id, playerId: id, guestId: null, name: id, avatarUrl: null, timeHundredths, isDnf: false, isAk: false, submittedAt, attemptNumber: Number(id), ...changes });

describe("event lead progression", () => {
  it("starts with the first valid attempt and only adds faster leaders", () => {
    const result = buildEventLeadProgression([
      attempt("1", 400, "2026-01-01T18:00:00Z"),
      attempt("2", 450, "2026-01-01T18:05:00Z"),
      attempt("3", 350, "2026-01-01T18:14:00Z"),
      attempt("4", 350, "2026-01-01T18:20:00Z"),
    ], "2026-01-01T19:26:00Z");
    expect(result.map(({ id }) => id)).toEqual(["1", "3"]);
    expect(result[1]).toMatchObject({ improvementHundredths: 50, durationLabel: "bis Eventende · 1 Std. 12 Min." });
  });

  it("excludes DNF and AK while retaining guests", () => {
    const result = buildEventLeadProgression([
      attempt("1", null, "2026-01-01T18:00:00Z", { isDnf: true }),
      attempt("2", 300, "2026-01-01T18:01:00Z", { isAk: true }),
      attempt("3", 320, "2026-01-01T18:02:00Z", { playerId: null, guestId: "guest" }),
    ], null);
    expect(result.map(({ id }) => id)).toEqual(["3"]);
  });

  it("handles events without a valid attempt", () => {
    expect(buildEventLeadProgression([attempt("1", null, "2026-01-01T18:00:00Z", { isDnf: true })], null)).toEqual([]);
    expect(formatLeadDuration("2026-01-01T18:00:00Z", "2026-01-01T18:19:00Z")).toBe("19 Min.");
  });
});
