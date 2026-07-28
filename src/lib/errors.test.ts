import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/lib/errors";

describe("error messages", () => {
  it("surfaces Supabase PostgREST messages from plain response objects", () => {
    expect(getErrorMessage({
      code: "P0001",
      message: "Es läuft bereits ein Event.",
    })).toBe("Es läuft bereits ein Event.");
  });
});
