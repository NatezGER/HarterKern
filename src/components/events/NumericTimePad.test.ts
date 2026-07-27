import { describe, expect, it } from "vitest";
import { appendTimeKey } from "@/lib/numericTimeInput";

describe("appendTimeKey", () => {
  it("builds German decimal times and limits them to hundredths", () => {
    expect(["2", ",", "0", "6", "9"].reduce(appendTimeKey, "")).toBe("2,06");
  });

  it("supports deletion and technical decimal points", () => {
    expect(appendTimeKey(appendTimeKey("2", "."), "3")).toBe("2,3");
    expect(appendTimeKey("2,3", "back")).toBe("2,");
  });
});
