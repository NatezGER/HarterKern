import { PageHeader } from "@/components/common/PageHeader";
import { PlayerCard } from "@/components/players/PlayerCard";
import { DataState } from "@/components/common/DataState";
import { appMeta } from "@/constants/content";
import { usePublicData } from "@/hooks/usePublicData";

export function PlayersPage() {
  const { data } = usePublicData();
  return (
    <div className="space-y-9">
      <PageHeader eyebrow="Roster" title="Spieler" description={appMeta.playersDescription} />
      <DataState>
        {data.players.length === 0 ? (
          <div className="panel py-20 text-center text-sm text-white/40">Noch keine Spieler vorhanden.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.players.map((player, index) => <PlayerCard key={player.id} player={player} delay={index * 0.035} />)}
          </div>
        )}
      </DataState>
    </div>
  );
}
