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
}) {
  if (badge.badgeKey === "official-world-record") return "WR";
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
  return badge.name?.slice(0, 2).toUpperCase() ?? "HK";
}
