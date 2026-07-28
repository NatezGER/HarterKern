import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlayerProfilePage } from "@/pages/PlayerProfilePage";
import { PlayersPage } from "@/pages/PlayersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";
import { LiveEventPage } from "@/pages/LiveEventPage";
import { EventResultsPage } from "@/pages/EventResultsPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "players", element: <PlayersPage /> },
      { path: "player/:id", element: <PlayerProfilePage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "events/live", element: <LiveEventPage /> },
      { path: "events/:eventId/results", element: <EventResultsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
