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
    {leaderboard}
    {specialStats}
    {attemptEntry}
    {leadStory}
    {participantManagement}
    {attemptHistory}
    {endAction}
  </>;
}
