import { describe, expect, it } from "vitest";
import { buildEventLeadProgression, formatLeadDuration } from "@/lib/eventLeadProgression";

const attempt = (id: string, timeHundredths: number | null, submittedAt: string, changes = {}) => ({ id, playerId: id, guestId: null, name: id, avatarUrl: null, timeHundredths, isDnf: false, isAk: false, submittedAt, attemptNumber: Number(id), ...changes });

describe("event lead progression", () => {
  it("preserves guest/player/guest/player leadership from the second valid time", () => {
    const points = buildEventLeadProgression([
      attempt("1", 320, "2026-01-01T18:00:00Z", { playerId: null, guestId: "anna" }),
      attempt("2", 310, "2026-01-01T18:25:00Z", { playerId: "paul" }),
      attempt("3", 295, "2026-01-01T19:05:00Z", { playerId: null, guestId: "tom" }),
      attempt("4", 290, "2026-01-01T19:15:00Z", { playerId: "fipsi" }),
    ], "2026-01-01T19:20:00Z");
    expect(points.map(point => point.id)).toEqual(["2", "3", "4"]);
    expect(points.map(point => point.durationLabel)).toEqual([
      "40 Min.", "10 Min.", "bis Eventende · 5 Min.",
    ]);
  });
  it("starts at the second valid attempt and only adds faster leaders", () => {
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
    expect(result.map(({ id }) => id)).toEqual([]);
  });

  it("handles events without a valid attempt", () => {
    expect(buildEventLeadProgression([attempt("1", null, "2026-01-01T18:00:00Z", { isDnf: true })], null)).toEqual([]);
    expect(formatLeadDuration("2026-01-01T18:00:00Z", "2026-01-01T18:19:00Z")).toBe("19 Min.");
  });

  it("labels the current live leader duration differently from a closed event", () => {
    const attempts = [attempt("1", 300, "2026-01-01T17:59:00Z"), attempt("2", 350, "2026-01-01T18:00:00Z")];
    expect(buildEventLeadProgression(attempts, null, "2026-01-01T18:20:00Z")[0])
      .toMatchObject({ periodEndAt: "2026-01-01T18:20:00Z", durationLabel: "führt seit 20 Min." });
    expect(buildEventLeadProgression(attempts, "2026-01-01T18:20:00Z")[0])
      .toMatchObject({ durationLabel: "bis Eventende · 20 Min." });
  });
});

it("waits for two valid times and retains an earlier best at the comparison timestamp",()=>{
 const first=attempt("1",300,"2026-01-01T18:00:00Z");
 expect(buildEventLeadProgression([first],null)).toEqual([]);
 for(const time of [300,350]) {
  const points=buildEventLeadProgression([first,attempt("2",time,"2026-01-01T18:05:00Z",{playerId:"1"})],null);
  expect(points).toHaveLength(1);expect(points[0]).toMatchObject({id:"1",submittedAt:"2026-01-01T18:05:00Z",improvementHundredths:null});
 }
});
it("orders simultaneous timestamps by ID and includes guest comparisons",()=>{
 const time="2026-01-01T18:00:00Z";
 const points=buildEventLeadProgression([attempt("3",250,time),attempt("1",350,time),attempt("2",300,time,{playerId:null,guestId:"g"})],null);
 expect(points.map(p=>[p.id,p.improvementHundredths])).toEqual([["2",null],["3",50]]);
});
