import { describe, expect, it } from "vitest";
import { attachBadgeRecipients } from "@/services/statsService";

describe("badge rarity recipients", () => {
  it("attaches unique recipients without changing the existing percentage", () => {
    const result = attachBadgeRecipients([{
      key: "fast", name: "Schnell", tier: "gold", recipients: 1,
      playerCount: 4, percent: 25,
    }], [{
      badgeKey: "fast", playerId: "player-1", playerName: "Paul", avatarUrl: "avatar.webp",
    }, {
      badgeKey: "fast", playerId: "player-1", playerName: "Paul", avatarUrl: "avatar.webp",
    }]);
    expect(result[0].percent).toBe(25);
    expect(result[0].recipientsList).toEqual([{
      playerId: "player-1", playerName: "Paul", avatarUrl: "avatar.webp",
    }]);
  });

  it("keeps an empty recipient list for unawarded badges", () => {
    const result = attachBadgeRecipients([{
      key: "empty", name: "Leer", tier: "bronze", recipients: 0,
      playerCount: 4, percent: 0,
    }], []);
    expect(result[0].recipientsList).toEqual([]);
  });
});
