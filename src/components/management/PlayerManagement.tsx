import { ImageUp, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { getInitials } from "@/utils/avatar";

export function PlayerManagement() {
  const { state, updatePlayer } = useLiveEvent();
  const [selectedId, setSelectedId] = useState(state.players[0]?.id ?? "");
  const player = state.players.find(({ id }) => id === selectedId);
  const [name, setName] = useState("");
  const [isAk, setIsAk] = useState(false);
  useEffect(() => {
    setName(player?.name ?? "");
    setIsAk(player?.isAk ?? false);
  }, [player]);
  if (!player) return null;
  const upload = (file?: File) => {
    if (!file || !file.type.startsWith("image/") || file.size > 500_000) return;
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" && updatePlayer(player.id, { avatarUrl: reader.result });
    reader.readAsDataURL(file);
  };
  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <h3 className="display-title text-2xl">Spieler bearbeiten</h3>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">
          {state.players.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <Input className="rounded-xl" value={name} onChange={(event) => setName(event.target.value)} />
        <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs"><input type="checkbox" checked={isAk} onChange={(event) => setIsAk(event.target.checked)} /> Außer Konkurrenz</label>
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold">
          <ImageUp className="size-4" /> Profilbild hochladen
          <input className="sr-only" type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>
      <Button
        className="mt-4"
        onClick={() => {
          const nextName = name.trim() || player.name;
          updatePlayer(player.id, { name: nextName, initials: getInitials(nextName), isAk });
        }}
      >
        <Save className="size-4" /> Spieler speichern
      </Button>
    </section>
  );
}
