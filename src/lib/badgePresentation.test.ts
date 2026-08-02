import { describe, expect, it } from "vitest";
import { badgeTierLabel, getBadgeCenterMark } from "@/lib/badgePresentation";

describe("badge presentation", () => {
  it("uses Platinum only as the visible name of the special tier", () => {
    expect(badgeTierLabel.special).toBe("Platinum");
    expect(badgeTierLabel.diamond).toBe("Diamond");
  });

  it("creates compact family-specific center marks", () => {
    expect(getBadgeCenterMark({ badgeKey: "official-world-record" })).toBe("WR");
    expect(getBadgeCenterMark({ badgeKey: "first-sub3", threshold: 300 })).toBe("<3s");
    expect(getBadgeCenterMark({ badgeKey: "event-wins-gold", category: "wins", threshold: 10 })).toBe("10×");
    expect(getBadgeCenterMark({ badgeKey: "important-event-gold" })).toBe("#1");
  });
});
