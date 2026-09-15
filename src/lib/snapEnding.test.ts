import { describe, expect, it } from "vitest";
import { isSnapEnding } from "@/lib/snapEnding";

describe("isSnapEnding", () => {
  it.each([11, 22, 33, 44, 55, 66, 77, 88, 99])(
    "accepts the non-zero repeated ending .%s", (ending) => {
      expect(isSnapEnding(300 + ending)).toBe(true);
    },
  );

  it.each([300, 301, 342, 310, 398])(
    "rejects the non-Schnapszahl time %s", (time) => {
      expect(isSnapEnding(time)).toBe(false);
    },
  );
});
