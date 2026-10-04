import { describe, expect, it } from "vitest";
import { buildProgressionCoordinates, buildStepPath, createTimeViewport, formatCurrentRecordDuration, formatRecordDuration, formatTimelineMoment, panTimeViewport, selectViewportPoints, zoomTimeViewport, type ProgressionDatum } from "@/lib/progression";

describe("progression chart", () => {
  it("zooms, pans and keeps the last step value before the visible window", () => {
    const full = createTimeViewport(["2026-01-01T00:00:00Z", "2026-05-01T00:00:00Z"]);
    expect(full).not.toBeNull();
    const zoomed = zoomTimeViewport(full!, full!, 0.5);
    expect(zoomed.endMs - zoomed.startMs).toBeLessThan(full!.endMs - full!.startMs);
    expect(panTimeViewport(zoomed, full!, 1).startMs).toBeGreaterThanOrEqual(zoomed.startMs);
    expect(zoomTimeViewport(zoomed, full!, 2)).toEqual(full);
    const selected = selectViewportPoints<ProgressionDatum>([
      { id: "before", achievedAt: "2026-01-01T00:00:00Z", timeHundredths: 400 },
      { id: "inside", achievedAt: "2026-03-01T00:00:00Z", timeHundredths: 350 },
    ], { startMs: Date.parse("2026-02-01T00:00:00Z"), endMs: Date.parse("2026-04-01T00:00:00Z") });
    expect(selected.map(({ id }) => id)).toEqual(["before", "inside"]);
    expect(selected[0].axisAt).toBe("2026-02-01T00:00:00.000Z");
  });
  it("keeps equal timestamps deterministic without inventing times", () => {
    const points = buildProgressionCoordinates([
      { id: "b", achievedAt: "2025-01-01", timeHundredths: 400 },
      { id: "a", achievedAt: "2025-01-01", timeHundredths: 500 },
    ]);
    expect(points.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(points.map(({ achievedAt }) => achievedAt)).toEqual(["2025-01-01", "2025-01-01"]);
  });

  it("draws faster records lower as an angular step path", () => {
    const points = buildProgressionCoordinates([
      { id: "a", achievedAt: "2025-01-01", timeHundredths: 500 },
      { id: "b", achievedAt: "2025-02-01", timeHundredths: 300 },
    ]);
    expect(points[1].y).toBeGreaterThan(points[0].y);
    expect(buildStepPath(points)).toContain(" H ");
    expect(buildStepPath(points)).toContain(" V ");
  });

  it("spaces record points proportionally to their real calendar distance", () => {
    const points = buildProgressionCoordinates([
      { id: "a", achievedAt: "2025-01-01", timeHundredths: 500 },
      { id: "b", achievedAt: "2025-01-06", timeHundredths: 400 },
      { id: "c", achievedAt: "2025-06-05", timeHundredths: 300 },
    ]);
    const shortGap = points[1].x - points[0].x;
    const longGap = points[2].x - points[1].x;
    expect(longGap).toBeGreaterThan(shortGap * 20);
  });

  it("reserves timeline width for the duration of the current record", () => {
    const points = buildProgressionCoordinates([
      { id: "a", achievedAt: "2025-01-01", timeHundredths: 500, durationDays: 10 },
      { id: "b", achievedAt: "2025-01-11", timeHundredths: 400, durationDays: 90 },
    ]);
    expect(points[1].x).toBeLessThan(30);
  });

  it("gives a single point a useful centered position", () => {
    expect(buildProgressionCoordinates([
      { id: "only", achievedAt: "2025-01-01", timeHundredths: 300 },
    ])[0]).toMatchObject({ x: 50, y: 50 });
    expect(formatRecordDuration(1)).toBe("1 Tag");
    expect(formatCurrentRecordDuration(426)).toBe("seit 426 Tagen");
    expect(formatTimelineMoment("2025-01-01T00:00:00Z", "2025-01-01", false)).toBe("1.1.2025");
    expect(formatTimelineMoment("2025-01-01T18:42:00Z", "2025-01-01", true)).toContain("19:42 Uhr");
  });

  it("places a single live point on the shared event time axis", () => {
    const [point] = buildProgressionCoordinates([
      { id: "only", achievedAt: "2025-01-01T10:15:00Z", timeHundredths: 300 },
    ], {
      startAt: "2025-01-01T10:00:00Z",
      endAt: "2025-01-01T11:00:00Z",
    });
    expect(point.x).toBeGreaterThan(7);
    expect(point.x).toBeLessThan(50);
  });

  it("formats summer timestamps in Europe/Berlin daylight saving time", () => {
    expect(formatTimelineMoment("2025-07-01T18:42:00Z", "2025-07-01", true)).toContain("20:42 Uhr");
  });
});
