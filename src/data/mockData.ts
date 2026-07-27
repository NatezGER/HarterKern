import type {
  Badge,
  DailyWinner,
  Event,
  LeaderboardEntry,
  Player,
  Statistic,
  WorldRecord,
} from "@/types";

export const badges: Badge[] = [
  { id: "world-record", name: "Weltrekord", description: "Schnellste Zeit aller Zeiten", tone: "gold", icon: "crown" },
  { id: "hot-streak", name: "Hot Streak", description: "Drei Tagessiege in Folge", tone: "beer", icon: "flame" },
  { id: "sub-three", name: "Sub 3", description: "Unter drei Sekunden", tone: "silver", icon: "zap" },
  { id: "veteran", name: "Veteran", description: "Mehr als 100 Versuche", tone: "bronze", icon: "medal" },
];

export const players: Player[] = [
  { id: "paul", name: "Paul", initials: "PA", avatarGradient: "from-amber-300 to-yellow-700", personalBest: 2.06, average: 3.14, attempts: 184, dailyWins: 28, trend: "same", form: [2.55, 2.43, 2.31, 2.22, 2.06], badgeIds: ["world-record", "hot-streak", "sub-three", "veteran"] },
  { id: "max", name: "Max", initials: "MX", avatarGradient: "from-slate-200 to-slate-600", personalBest: 2.18, average: 3.26, attempts: 167, dailyWins: 21, trend: "up", form: [2.71, 2.58, 2.62, 2.31, 2.18], badgeIds: ["sub-three", "veteran"] },
  { id: "jonas", name: "Jonas", initials: "JO", avatarGradient: "from-orange-400 to-amber-800", personalBest: 2.29, average: 3.42, attempts: 143, dailyWins: 17, trend: "down", form: [2.67, 2.51, 2.48, 2.36, 2.29], badgeIds: ["sub-three", "veteran"] },
  { id: "tobi", name: "Tobi", initials: "TO", avatarGradient: "from-cyan-300 to-blue-700", personalBest: 2.37, average: 3.55, attempts: 129, dailyWins: 14, trend: "up", form: [2.88, 2.69, 2.53, 2.44, 2.37], badgeIds: ["sub-three", "veteran"] },
  { id: "fabi", name: "Fabi", initials: "FA", avatarGradient: "from-fuchsia-300 to-purple-800", personalBest: 2.42, average: 3.63, attempts: 118, dailyWins: 11, trend: "same", form: [2.76, 2.83, 2.58, 2.49, 2.42], badgeIds: ["sub-three", "veteran"] },
  { id: "luke", name: "Luke", initials: "LU", avatarGradient: "from-emerald-300 to-emerald-800", personalBest: 2.51, average: 3.71, attempts: 104, dailyWins: 9, trend: "up", form: [3.04, 2.87, 2.72, 2.64, 2.51], badgeIds: ["sub-three", "veteran"] },
  { id: "niko", name: "Niko", initials: "NI", avatarGradient: "from-rose-300 to-red-800", personalBest: 2.65, average: 3.82, attempts: 96, dailyWins: 7, trend: "down", form: [2.91, 2.78, 2.89, 2.72, 2.65], badgeIds: ["sub-three"] },
  { id: "marc", name: "Marc", initials: "MC", avatarGradient: "from-indigo-300 to-indigo-800", personalBest: 2.73, average: 3.93, attempts: 83, dailyWins: 6, trend: "same", form: [3.18, 2.96, 2.91, 2.84, 2.73], badgeIds: ["sub-three"] },
  { id: "dave", name: "Dave", initials: "DA", avatarGradient: "from-lime-300 to-green-800", personalBest: 2.88, average: 4.06, attempts: 71, dailyWins: 4, trend: "up", form: [3.32, 3.15, 3.03, 2.94, 2.88], badgeIds: ["sub-three"] },
  { id: "sven", name: "Sven", initials: "SV", avatarGradient: "from-sky-300 to-sky-800", personalBest: 2.96, average: 4.18, attempts: 66, dailyWins: 3, trend: "down", form: [3.41, 3.26, 3.18, 3.04, 2.96], badgeIds: ["sub-three"] },
  { id: "chris", name: "Chris", initials: "CH", avatarGradient: "from-teal-300 to-teal-800", personalBest: 3.08, average: 4.27, attempts: 59, dailyWins: 2, trend: "up", form: [3.59, 3.44, 3.31, 3.16, 3.08], badgeIds: [] },
  { id: "ben", name: "Ben", initials: "BE", avatarGradient: "from-violet-300 to-violet-800", personalBest: 3.21, average: 4.39, attempts: 48, dailyWins: 1, trend: "same", form: [3.71, 3.53, 3.44, 3.35, 3.21], badgeIds: [] },
];

export const leaderboard: LeaderboardEntry[] = players
  .map((player, index) => ({
    playerId: player.id,
    rank: index + 1,
    previousRank: player.trend === "up" ? index + 2 : player.trend === "down" ? Math.max(1, index) : index + 1,
    recordDate: ["2025-05-31", "2025-06-14", "2025-04-19", "2025-07-05"][index % 4],
  }));

export const dailyWinners: DailyWinner[] = [
  { id: "dw-1", date: "2025-07-05", playerId: "tobi", time: 2.37, attempts: 8 },
  { id: "dw-2", date: "2025-06-28", playerId: "paul", time: 2.21, attempts: 11 },
  { id: "dw-3", date: "2025-06-21", playerId: "max", time: 2.32, attempts: 9 },
  { id: "dw-4", date: "2025-06-14", playerId: "max", time: 2.18, attempts: 12 },
];

export const worldRecordHistory: WorldRecord[] = [
  { id: "wr-1", playerId: "paul", time: 2.06, date: "2025-05-31", location: "Clubhaus" },
  { id: "wr-2", playerId: "max", time: 2.18, date: "2025-03-22", location: "Arena Nord" },
  { id: "wr-3", playerId: "jonas", time: 2.29, date: "2024-11-16", location: "Clubhaus" },
  { id: "wr-4", playerId: "paul", time: 2.41, date: "2024-08-03", location: "Sommerfest" },
  { id: "wr-5", playerId: "tobi", time: 2.58, date: "2024-04-20", location: "Clubhaus" },
];

export const events: Event[] = [
  { id: "event-1", title: "Summer Speed Night", date: "2025-08-16", location: "Clubhaus", participantIds: ["paul", "max", "jonas", "tobi", "fabi", "luke", "niko", "marc"], attempts: 64, status: "upcoming" },
  { id: "event-2", title: "Golden Pint Cup", date: "2025-07-05", location: "Arena Nord", participantIds: ["paul", "max", "tobi", "fabi"], attempts: 41, status: "completed" },
];

export const statistics: Statistic[] = [
  { id: "fastest", label: "Schnellste Zeit", value: "2,06 s", change: "−0,12 s zum Vorrekord", icon: "timer" },
  { id: "attempts", label: "Versuche gesamt", value: "1.268", change: "+84 diesen Monat", icon: "target" },
  { id: "players", label: "Aktive Spieler", value: "12", change: "+2 in dieser Saison", icon: "users" },
  { id: "wins", label: "Tagessiege", value: "123", change: "28 davon an Paul", icon: "trophy" },
];

export const appMeta = {
  season: "Saison 2025",
  heroEyebrow: "THE ORIGINAL SPEED DRINKING LEAGUE",
  heroTitle: "Harter Kern",
  heroSubtitle: "2 Fast 2 Drink",
  heroDescription: "Wo Sekunden zu Legenden werden.",
  leaderboardDescription: "Die ewige Rangliste. Ein Versuch kann alles verändern.",
  playersDescription: "Die Athleten hinter den Zeiten.",
  statsDescription: "Zahlen, Rekorde und die Geschichte einer Liga.",
};
