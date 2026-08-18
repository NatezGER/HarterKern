import type { ReactNode } from "react";

export function LiveEventContentOrder({
  leaderboard,
  attemptEntry,
  leadStory,
  participantManagement,
  attemptHistory,
  endAction,
}: {
  leaderboard: ReactNode;
  attemptEntry: ReactNode;
  leadStory: ReactNode;
  participantManagement: ReactNode;
  attemptHistory: ReactNode;
  endAction: ReactNode;
}) {
  return <>
    {leaderboard}
    {attemptEntry}
    {leadStory}
    {participantManagement}
    {attemptHistory}
    {endAction}
  </>;
}
