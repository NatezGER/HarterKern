import { PageHeader } from "@/components/common/PageHeader";
import { PlayerCard } from "@/components/players/PlayerCard";
import { appMeta, players } from "@/data/mockData";

export function PlayersPage() {
  return (
    <div className="space-y-9">
      <PageHeader eyebrow="Roster" title="Spieler" description={appMeta.playersDescription} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {players.map((player, index) => <PlayerCard key={player.id} player={player} delay={index * 0.035} />)}
      </div>
    </div>
  );
}
