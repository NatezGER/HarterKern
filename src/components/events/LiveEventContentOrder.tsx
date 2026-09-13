import type { ReactNode } from "react";

export function LiveEventContentOrder({
  leaderboard,
  specialStats,
  attemptEntry,
  leadStory,
  participantManagement,
  attemptHistory,
  endAction,
}: {
  leaderboard: ReactNode;
  specialStats?: ReactNode;
  attemptEntry: ReactNode;
  leadStory: ReactNode;
  participantManagement: ReactNode;
  attemptHistory: ReactNode;
  endAction: ReactNode;
}) {
  return <>
    {attemptEntry}
    {leaderboard}
    {specialStats}
    {leadStory}
    {participantManagement}
    {attemptHistory}
    {endAction}
  </>;
}
