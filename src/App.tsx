import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlayerProfilePage } from "@/pages/PlayerProfilePage";
import { PlayersPage } from "@/pages/PlayersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";
import { StatsMostWantedPage } from "@/pages/StatsMostWantedPage";
import { StatsOverviewPage } from "@/pages/StatsOverviewPage";
import { StatsRivalriesPage } from "@/pages/StatsRivalriesPage";
import { StatsBadgesPage } from "@/pages/StatsBadgesPage";
import { LiveEventPage } from "@/pages/LiveEventPage";
import { EventResultsPage } from "@/pages/EventResultsPage";
import { EventsPage } from "@/pages/EventsPage";
import { HistoricalAttemptsPage } from "@/pages/HistoricalAttemptsPage";
import { PlayerComparePage } from "@/pages/PlayerComparePage";
import { DkToolsPage } from "@/pages/DkToolsPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "players", element: <PlayersPage /> },
      { path: "player/:id", element: <PlayerProfilePage /> },
      { path: "compare", element: <PlayerComparePage /> },
      { path: "stats", element: <StatsOverviewPage /> },
      { path: "stats/performance", element: <StatsPage /> },
      { path: "stats/milestones", element: <StatsMostWantedPage /> },
      { path: "stats/most-wanted", element: <Navigate to="/stats/milestones" replace /> },
      { path: "stats/rivalries", element: <StatsRivalriesPage /> },
      { path: "stats/badges", element: <StatsBadgesPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "events/live", element: <LiveEventPage /> },
      { path: "events", element: <EventsPage /> },
      { path: "events/:eventId", element: <EventResultsPage /> },
      { path: "events/:eventId/results", element: <EventResultsPage /> },
      { path: "history", element: <HistoricalAttemptsPage /> },
      { path: "dk", element: <DkToolsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
