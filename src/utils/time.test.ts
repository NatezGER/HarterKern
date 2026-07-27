import { describe, expect, it } from "vitest";
import { hundredthsToSeconds, parseTimeToHundredths } from "@/utils/time";

describe("parseTimeToHundredths", () => {
  it("accepts German comma input", () => {
    expect(parseTimeToHundredths("2,06")).toBe(206);
  });

  it("accepts decimal point input", () => {
    expect(parseTimeToHundredths("2.06")).toBe(206);
  });

  it("rounds to hundredths", () => {
    expect(parseTimeToHundredths("2.1")).toBe(210);
  });

  it.each(["", "0", "-1", "abc", "2.067", "301"])("rejects invalid input %s", (value) => {
    expect(parseTimeToHundredths(value)).toBeNull();
  });
});

describe("hundredthsToSeconds", () => {
  it("formats storage values without floating-point calculations in persistence", () => {
    expect(hundredthsToSeconds(206)).toBe(2.06);
  });
});
