import { getAvatarGradient, getInitials } from "@/utils/avatar";
import type { LiveEventState, LiveParticipant } from "@/types/liveEvent";

const participant = (
  id: string,
  name: string,
  personalBest: number,
  isAk = false,
): LiveParticipant => ({
  id,
  name,
  personalBest,
  isAk,
  initials: getInitials(name),
  avatarGradient: getAvatarGradient(id),
  avatarUrl: null,
});

export const demoParticipants = [
  participant("demo-paul", "Paul", 2.06),
  participant("demo-mats", "Mats", 2.34),
  participant("demo-jonas", "Jonas", 2.51),
  participant("demo-langer-name", "Christopher Turbo", 2.67),
  participant("demo-rookie", "Rookie", 0),
  participant("demo-ak", "Gastfahrer AK", 2.12, true),
];

export function createDemoLiveState(now = new Date()): LiveEventState {
  const startedAt = new Date(now.getTime() - 2.5 * 60 * 60 * 1000);
  const endsAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);
  const eventId = "demo-live-event";
  return {
    version: 1,
    role: "admin",
    events: [{
      id: eventId,
      name: "European Speed Cup 2027",
      date: startedAt.toISOString().slice(0, 10),
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: "active",
      participantIds: demoParticipants.map(({ id }) => id),
      participants: demoParticipants,
      createdBy: "Demo-Admin",
    }],
    attempts: [
      {
        id: "demo-approved",
        eventId,
        playerId: "demo-paul",
        result: "time",
        timeSeconds: 2.18,
        status: "approved",
        submittedAt: new Date(startedAt.getTime() + 30_000).toISOString(),
        submittedBy: "Demo-Admin",
        submittedByRole: "admin",
        approvedAt: new Date(startedAt.getTime() + 30_000).toISOString(),
        approvedBy: "Demo-Admin",
      },
      {
        id: "demo-pending",
        eventId,
        playerId: "demo-mats",
        result: "time",
        timeSeconds: 1.98,
        status: "pending",
        submittedAt: new Date(startedAt.getTime() + 60_000).toISOString(),
        submittedBy: "Demo-Nutzer",
        submittedByRole: "user",
      },
      {
        id: "demo-dns",
        eventId,
        playerId: "demo-jonas",
        result: "dns",
        status: "approved",
        submittedAt: new Date(startedAt.getTime() + 90_000).toISOString(),
        submittedBy: "Demo-Admin",
        submittedByRole: "admin",
      },
    ],
  };
}
