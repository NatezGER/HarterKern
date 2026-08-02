import type { BadgeTier } from "@/types/pr7Foundation";

export const badgeTierLabel: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Silber",
  gold: "Gold",
  diamond: "Diamond",
  special: "Platinum",
};

export function getBadgeCenterMark(badge: {
  badgeKey: string;
  category?: string;
  threshold?: number | null;
  name?: string;
  valueHundredths?: number | null;
}) {
  if (badge.badgeKey === "official-world-record") return "WR";
  if (badge.badgeKey === "false-starter") return "DNF";
  if (badge.badgeKey === "matrix-glitch") return "==";
  if (badge.badgeKey === "first-official-attempt") return "#1";
  if (badge.badgeKey === "first-win") return "W1";
  if (badge.badgeKey === "time-stopper" || badge.badgeKey === "almost" ||
    badge.category === "favorite_time") {
    return badge.valueHundredths == null
      ? (badge.badgeKey === "almost" ? ",01" : ",00")
      : (badge.valueHundredths / 100).toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  }
  if (badge.category === "most_wanted") return "MW";
  if (badge.category === "precision") return "±";
  if (badge.category === "podiums") return "TOP3";
  if (badge.badgeKey.startsWith("first-sub")) {
    const seconds = badge.threshold ? badge.threshold / 100 : Number(badge.badgeKey.replace("first-sub", ""));
    return `<${seconds}s`;
  }
  if (badge.badgeKey.startsWith("important-event-")) {
    if (badge.badgeKey.endsWith("gold")) return "#1";
    if (badge.badgeKey.endsWith("silver")) return "#2";
    return "#3";
  }
  if (badge.category === "wins") return `${badge.threshold ?? "W"}×`;
  if (badge.category === "streak") return `${badge.threshold ?? "S"}×`;
  if (badge.category === "attempts") return String(badge.threshold ?? "A");
  if (badge.category === "win_streak" || badge.category === "sub3_streak" ||
    badge.category === "flawless") return `${badge.threshold ?? "S"}×`;
  return badge.name?.slice(0, 2).toUpperCase() ?? "HK";
}
