import type { ReactNode } from "react";

export function LiveEventContentOrder({
  leaderboard,
  attemptEntry,
  leadStory,
  participantManagement,
  attemptHistory,
}: {
  leaderboard: ReactNode;
  attemptEntry: ReactNode;
  leadStory: ReactNode;
  participantManagement: ReactNode;
  attemptHistory: ReactNode;
}) {
  return <>
    {leaderboard}
    {attemptEntry}
    {leadStory}
    {participantManagement}
    {attemptHistory}
  </>;
}
