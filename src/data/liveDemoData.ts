import { getAvatarGradient, getInitials } from "@/utils/avatar";
import type { LiveEventState, LiveParticipant } from "@/types/liveEvent";

const participant = (
  index: number,
  name: string,
  personalBest: number,
  isAk = false,
): LiveParticipant => {
  const id = `10000000-0000-0000-0000-${String(index).padStart(12, "0")}`;
  return {
    id,
    name,
    personalBest,
    isAk,
    initials: getInitials(name),
    avatarGradient: getAvatarGradient(id),
    avatarUrl: null,
  };
};

export const demoParticipants = [
  participant(1, "Paul", 2.06),
  participant(2, "Max", 2.18),
  participant(3, "Jonas", 2.29),
  participant(11, "Chris", 2.67),
  participant(12, "Ben", 0),
  participant(99, "Gastfahrer AK", 2.12, true),
];

export function createDemoLiveState(now = new Date()): LiveEventState {
  const startedAt = new Date(now.getTime() - 2.5 * 60 * 60 * 1000);
  const eventId = "demo-live-event";
  return {
    version: 2,
    players: demoParticipants,
    events: [{
      id: eventId,
      name: "European Speed Cup 2027",
      date: startedAt.toISOString().slice(0, 10),
      startedAt: startedAt.toISOString(),
      endsAt: new Date(startedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      participantIds: demoParticipants.map(({ id }) => id),
      createdBy: "Live-Modus",
    }],
    attempts: [
      {
        id: "demo-paul",
        eventId,
        playerId: demoParticipants[0].id,
        result: "time",
        timeSeconds: 2.18,
        date: startedAt.toISOString().slice(0, 10),
        submittedAt: new Date(startedAt.getTime() + 30_000).toISOString(),
        outOfCompetition: false,
      },
      {
        id: "demo-max",
        eventId,
        playerId: demoParticipants[1].id,
        result: "time",
        timeSeconds: 2.31,
        date: startedAt.toISOString().slice(0, 10),
        submittedAt: new Date(startedAt.getTime() + 60_000).toISOString(),
        outOfCompetition: false,
      },
      {
        id: "demo-dns",
        eventId,
        playerId: demoParticipants[2].id,
        result: "dns",
        date: startedAt.toISOString().slice(0, 10),
        submittedAt: new Date(startedAt.getTime() + 90_000).toISOString(),
        outOfCompetition: false,
      },
    ],
  };
}
