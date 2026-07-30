import { describe, expect, it } from "vitest";
import { requirePostgresUuid } from "./validation";

describe("PostgreSQL UUID validation for admin media", () => {
  it("accepts existing seed player IDs without RFC version bits", () => {
    expect(requirePostgresUuid("11000000-0000-0000-0000-000000000001", "Spieler"))
      .toBe("11000000-0000-0000-0000-000000000001");
  });

  it("accepts existing seed event IDs without RFC variant bits", () => {
    expect(requirePostgresUuid("22000000-0000-0000-0000-000000000001", "Event"))
      .toBe("22000000-0000-0000-0000-000000000001");
  });

  it("accepts standard random UUIDs", () => {
    expect(requirePostgresUuid("c8ace655-ae1d-4c37-8d55-934c30ef4b4c", "Foto"))
      .toBe("c8ace655-ae1d-4c37-8d55-934c30ef4b4c");
  });

  it.each([
    "",
    "11000000-0000-0000-0000-000000000001' OR true --",
    "11000000-0000-0000-0000-00000000001",
    "11000000-0000-0000-0000-000000000001/extra",
  ])("rejects malformed or injected values: %s", (id) => {
    expect(() => requirePostgresUuid(id, "Spieler")).toThrow("Spieler ist ungültig.");
  });
});
