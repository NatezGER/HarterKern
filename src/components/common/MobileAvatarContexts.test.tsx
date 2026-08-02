import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LiveStanding, StartLiveEventParticipant } from "@/types/liveEvent";
import type { Player } from "@/types";

vi.mock("@/hooks/useEffectivePublicData", () => ({
  useEffectivePublicData: () => ({ data: { players: [], leaderboard: [] } }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

vi.mock("@/data/selectors", () => ({
  getPodiumPlayers: () => [1, 2, 3].map((rank) => ({
    rank,
    previousRank: rank,
    recordDate: "2026-01-01",
    player: {
      id: `player-${rank}`,
      name: `Spieler ${rank}`,
      initials: `S${rank}`,
      avatarGradient: "from-amber-300 to-amber-700",
      avatarUrl: `https://example.test/avatar-${rank}.png`,
      personalBest: 2 + rank / 10,
      average: 3,
      attempts: 4,
      validAttempts: 4,
      dnfCount: 0,
      dailyWins: 1,
      trend: "same",
      isAk: false,
      isArchived: false,
    },
  })),
}));

vi.mock("@/hooks/useLiveEvent", () => ({
  useLiveEvent: () => ({ startEvent: vi.fn(), startingEvent: false }),
}));

import { ParticipantCard } from "@/components/events/ParticipantCard";
import { StartEventPanel } from "@/components/events/StartEventPanel";
import { Podium } from "@/components/leaderboard/Podium";
import { PlayerCard } from "@/components/players/PlayerCard";

const player: Player = {
  id: "player-standard",
  name: "Paul",
  initials: "P",
  avatarGradient: "from-amber-300 to-amber-700",
  avatarUrl: "https://example.test/paul.png",
  personalBest: 2.06,
  average: 3.12,
  attempts: 12,
  validAttempts: 11,
  dnfCount: 1,
  dailyWins: 2,
  trend: "same",
  isAk: false,
  isArchived: false,
};

const livePlayer: StartLiveEventParticipant = {
  id: player.id,
  name: player.name,
  kind: "permanent",
  source: "existing-player",
  initials: player.initials,
  avatarGradient: player.avatarGradient,
  avatarUrl: player.avatarUrl,
  personalBest: player.personalBest,
  isAk: false,
};

const standing: LiveStanding = {
  player: livePlayer,
  rank: 1,
  bestTime: 2.06,
  averageTime: 2.4,
  attempts: 3,
};

const renderContext = (node: ReactNode) => renderToStaticMarkup(node);
const occurrences = (markup: string) => markup.split("max-sm:p-0.5").length - 1;

describe("mobile avatar contexts", () => {
  it("frames all three dashboard and Hall-of-Fame podium avatars", () => {
    const markup = renderContext(<Podium />);

    expect(occurrences(markup)).toBe(3);
    expect(markup.match(/size-(?:16|24)/g)).toHaveLength(3);
  });

  it("frames only the mobile avatar in the two-layout player card", () => {
    const markup = renderContext(<PlayerCard player={player} />);

    expect(occurrences(markup)).toBe(1);
  });

  it("frames every candidate in the event-start selection", () => {
    const markup = renderContext(<StartEventPanel candidates={[livePlayer]} onStarted={vi.fn()} />);

    expect(occurrences(markup)).toBe(1);
    expect(markup).toContain('class="size-full rounded-full object-cover"');
  });

  it("frames only the mobile add-attempt participant avatar", () => {
    const markup = renderContext(<ParticipantCard standing={standing} saved={false} onAdd={vi.fn()} />);

    expect(occurrences(markup)).toBe(1);
    expect(markup).toContain('class="size-full object-cover"');
  });

  it("does not add contextual classes to the image elements", () => {
    const markup = [
      renderContext(<Podium />),
      renderContext(<PlayerCard player={player} />),
      renderContext(<StartEventPanel candidates={[livePlayer]} onStarted={vi.fn()} />),
      renderContext(<ParticipantCard standing={standing} saved={false} onAdd={vi.fn()} />),
    ].join("");
    const imageClasses = [...markup.matchAll(/<img[^>]+class="([^"]+)"/g)].map((match) => match[1]);

    expect(imageClasses.length).toBeGreaterThan(0);
    expect(imageClasses.every((className) => [
      "size-full rounded-full object-cover object-center",
      "size-full rounded-full object-cover",
      "size-full object-cover",
    ].includes(className))).toBe(true);
  });
});
