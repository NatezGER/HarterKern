import { Save, UsersRound } from "lucide-react";
import { useState } from "react";
import type { Player } from "@/types";
import { mergePlayers, updatePlayer } from "@/services/playerService";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function PlayerRow({ player, onChanged }: { player: Player; onChanged: () => Promise<void> }) {
  const [name, setName] = useState(player.name);
  const [isAk, setIsAk] = useState(player.isAk);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2 rounded-2xl border border-white/[0.07] bg-black/20 p-3 sm:grid-cols-[1fr_auto_auto]">
      <Input value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-xl" />
      <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs">
        <input type="checkbox" checked={isAk} onChange={(event) => setIsAk(event.target.checked)} />
        AK
      </label>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setError(null);
          void updatePlayer(player.id, { display_name: name.trim(), is_ak: isAk })
            .then(onChanged)
            .catch((actionError: unknown) => setError(getErrorMessage(actionError)));
        }}
      >
        <Save className="size-3.5" /> Speichern
      </Button>
      {error && <p className="text-xs text-red-300 sm:col-span-3">{error}</p>}
    </div>
  );
}

export function PlayerManager({ players, onChanged }: { players: Player[]; onChanged: () => Promise<void> }) {
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="panel p-5 sm:p-7">
      <h3 className="display-title text-2xl">Spielerverwaltung</h3>
      <div className="mt-5 space-y-2">
        {players.map((player) => <PlayerRow key={player.id} player={player} onChanged={onChanged} />)}
      </div>
      <div className="mt-6 border-t border-white/[0.07] pt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-white/45">Profile zusammenführen</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
            <option value="">Quellprofil</option>
            {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
          <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
            <option value="">Zielprofil</option>
            {players.filter((player) => player.id !== sourceId).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
          <Button
            variant="outline"
            disabled={!sourceId || !targetId}
            onClick={() => {
              setError(null);
              void mergePlayers(sourceId, targetId)
                .then(onChanged)
                .catch((actionError: unknown) => setError(getErrorMessage(actionError)));
            }}
          >
            <UsersRound className="size-4" /> Zusammenführen
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>
    </section>
  );
}
