import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlayerProfilePage } from "@/pages/PlayerProfilePage";
import { PlayersPage } from "@/pages/PlayersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="player/:id" element={<PlayerProfilePage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
