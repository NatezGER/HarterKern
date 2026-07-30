import { ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { removePlayerAvatar, uploadPlayerAvatar } from "@/services/mediaService";
import { getInitials } from "@/utils/avatar";

export function PlayerManagement() {
  const { state, updatePlayer } = useLiveEvent();
  const { refresh } = useDataPlatform();
  const permanentPlayers = state.players.filter(({ kind }) => kind === "permanent");
  const [selectedId, setSelectedId] = useState(permanentPlayers[0]?.id ?? "");
  const player = permanentPlayers.find(({ id }) => id === selectedId);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setName(player?.name ?? ""), [player]);
  if (!player) return null;
  const upload = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await uploadPlayerAvatar(player.id, file);
      setMessage("Profilbild gespeichert.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profilbild konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await removePlayerAvatar(player.id);
      setMessage("Profilbild entfernt.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profilbild konnte nicht entfernt werden.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl border border-white/10 p-5">
      <h3 className="display-title text-2xl">Spieler bearbeiten</h3>
      <div className="mt-4 flex items-center gap-4"><ProfileAvatar id={player.id} name={player.name} url={player.avatarUrl} className="size-20" /><div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><label className={busy ? "pointer-events-none opacity-50" : "cursor-pointer"}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Bild wählen<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} /></label></Button>{player.avatarUrl && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}><Trash2 className="size-4" /> Entfernen</Button>}</div></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm">{permanentPlayers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input className="rounded-xl" value={name} onChange={(event) => setName(event.target.value)} /></div>
      <Button className="mt-4" disabled={busy} onClick={() => { const nextName = name.trim() || player.name; void updatePlayer(player.id, { name: nextName, initials: getInitials(nextName) }); }}><Save className="size-4" /> Spieler speichern</Button>
      <p aria-live="polite" className="mt-3 text-xs text-white/45">{message}</p>
    </section>
  );
}
