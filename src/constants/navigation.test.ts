import { describe, expect, it } from "vitest";
import { navigationItems } from "@/constants/navigation";

describe("navigationItems", () => {
  it("places the event archive between Live and statistics", () => {
    expect(navigationItems.map(({ label, href }) => ({ label, href }))).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Hall of Fame", href: "/leaderboard" },
      { label: "Spieler", href: "/players" },
      { label: "Live", href: "/events/live" },
      { label: "Events", href: "/events" },
      { label: "Statistiken", href: "/stats" },
      { label: "Einstellungen", href: "/settings" },
    ]);
  });
});
