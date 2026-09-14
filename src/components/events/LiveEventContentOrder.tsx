import type { ReactNode } from "react";

export function LiveEventContentOrder({
  eventHeader,
  leaderboard,
  specialStats,
  attemptEntry,
  leadStory,
  participantManagement,
  attemptHistory,
  endAction,
}: {
  eventHeader: ReactNode;
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
    {eventHeader}
    {leaderboard}
    {specialStats}
    {leadStory}
    {participantManagement}
    {attemptHistory}
    {endAction}
  </>;
}
