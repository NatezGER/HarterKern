import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { getInitials } from "@/utils/avatar";

export function PlayerManagement() {
  const { state, updatePlayer } = useLiveEvent();
  const permanentPlayers = state.players.filter(({ kind }) => kind === "permanent");
  const [selectedId, setSelectedId] = useState(permanentPlayers[0]?.id ?? "");
  const player = permanentPlayers.find(({ id }) => id === selectedId);
  const [name, setName] = useState("");
  useEffect(() => {
    setName(player?.name ?? "");
  }, [player]);
  if (!player) return null;
  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <h3 className="display-title text-2xl">Spieler bearbeiten</h3>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
          {permanentPlayers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <Input className="rounded-xl" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <p className="mt-3 text-xs text-white/35">Profilbilder folgen mit PR 6C.</p>
      <Button
        className="mt-4"
        onClick={() => {
          const nextName = name.trim() || player.name;
          void updatePlayer(player.id, { name: nextName, initials: getInitials(nextName) });
        }}
      >
        <Save className="size-4" /> Spieler speichern
      </Button>
    </section>
  );
}
