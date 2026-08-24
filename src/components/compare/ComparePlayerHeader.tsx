import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { PlayerSelector } from "@/components/compare/PlayerSelector";
import { formatTime } from "@/utils/format";
import type { Player } from "@/types";
import type { ComparePlayerCore } from "@/services/playerCompareService";

interface ComparePlayerHeaderProps {
  side: "A" | "B";
  player: Player | null;
  detail: ComparePlayerCore | null;
  players: Player[];
  excludedPlayerId: string | null;
  onChange: (playerId: string) => void;
  seasonLabel: string;
}

export function ComparePlayerHeader({
  side,
  player,
  detail,
  players,
  excludedPlayerId,
  onChange,
  seasonLabel,
}: ComparePlayerHeaderProps) {
  const stats = detail?.statistics;
  return (
    <div className="min-w-0 text-center">
      {player ? (
        <ProfileAvatar
          id={player.id}
          name={player.name}
          url={player.avatarUrl}
          className="mx-auto size-20 ring-gold-400/25 sm:size-28"
        />
      ) : (
        <span className="mx-auto grid size-20 place-items-center rounded-full border border-dashed border-white/15 bg-white/[0.025] font-display text-2xl font-black text-white/20 sm:size-28">
          {side}
        </span>
      )}
      <div className="mt-4">
        <PlayerSelector
          players={players}
          player={player}
          excludedPlayerId={excludedPlayerId}
          label={`Spieler ${side} auswählen`}
          onChange={onChange}
        />
      </div>
      <div className="mt-3 grid gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/35 sm:text-xs">
        <span>{stats?.rank != null ? `${seasonLabel}rang #${stats.rank}` : `Ohne ${seasonLabel.toLowerCase()}rang`}</span>
        <span className="context-accent-text font-display text-lg font-black normal-case tracking-normal sm:text-2xl">
          {stats?.personalBestHundredths == null
            ? "—"
            : formatTime(stats.personalBestHundredths / 100)}
        </span>
      </div>
    </div>
  );
}
