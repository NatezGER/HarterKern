import { Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PlayerSelector } from "@/components/compare/PlayerSelector";
import { getRosterPlayers } from "@/data/selectors";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { buildCompareUrl, getComparePlayerOptions } from "@/lib/playerCompare";

export function ProfileCompareAction({ playerId }: { playerId: string }) {
  const navigate = useNavigate();
  const { data } = useEffectivePublicData();
  const players = getComparePlayerOptions(getRosterPlayers(data.players));
  if (!players.some(({ id }) => id === playerId)) return null;
  return (
    <div className="flex items-center gap-2">
      <Swords className="context-accent-text size-4 shrink-0" aria-hidden="true" />
      <PlayerSelector
        compact
        players={players}
        player={null}
        excludedPlayerId={playerId}
        label="Vergleichen mit …"
        onChange={(opponentId) => navigate(buildCompareUrl(playerId, opponentId))}
      />
    </div>
  );
}
