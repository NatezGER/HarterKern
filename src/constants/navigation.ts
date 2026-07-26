import { BarChart3, LayoutDashboard, Settings, Trophy, Users } from "lucide-react";

export const navigationItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Hall of Fame", href: "/leaderboard", icon: Trophy },
  { label: "Spieler", href: "/players", icon: Users },
  { label: "Statistiken", href: "/stats", icon: BarChart3 },
  { label: "Einstellungen", href: "/settings", icon: Settings },
] as const;

export const brand = {
  name: "Harter Kern",
  subtitle: "2 Fast 2 Drink",
  shortName: "HK",
};
