import { useRef, useState } from "react";
import { beerMilestones, teamTimeMilestones, type TeamMilestoneDefinition } from "@/constants/teamMilestones";
import { useMilestoneContent } from "@/hooks/useMilestoneContent";
import { saveMilestoneContent, type MilestoneContent } from "@/services/milestoneContentService";
import { MilestoneArtwork } from "@/components/stats/MilestoneArtwork";
import { Button } from "@/components/ui/button";

export function MilestoneManagement() {
  const content = useMilestoneContent();
  return <section className="min-w-0 rounded-2xl border border-white/10 p-3 sm:p-5">
    <h3 className="display-title text-2xl">Meilensteine verwalten</h3>
    <p className="my-3 text-sm text-white/50">Bilder: empfohlen 1920 × 1080 px · 16:9, mindestens ca. 1280 × 720 px. WebP, PNG oder JPEG, maximal 5 MB. Wichtige Motive mittig platzieren; andere Formate werden zugeschnitten.</p>
    {content.error && <p role="alert">{content.error}</p>}
    {content.loading ? <p role="status">Inhalte werden geladen …</p> : !content.error && <div className="space-y-4">
      {[["Gemeinsam getrunken", beerMilestones], ["Top-10-Teamzeit", teamTimeMilestones]].map(([label, entries]) => <details key={String(label)}><summary className="cursor-pointer py-3 font-bold text-gold-200">{String(label)}</summary>
        <div className="grid gap-3 lg:grid-cols-2">{(entries as TeamMilestoneDefinition[]).map(item => <MilestoneEditor key={item.id} item={item} content={content.data[item.id]} />)}</div>
      </details>)}
    </div>}
  </section>;
}
export function MilestoneEditor({ item, content }: { item: TeamMilestoneDefinition; content?: MilestoneContent }) {
  const [text, setText] = useState(content?.infoText ?? "");
  const [revision, setRevision] = useState(content?.updatedAt);
  const [file, setFile] = useState<File>();
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const save = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(""); setFailed(false);
    try { const updated = await saveMilestoneContent(item.id, text, file, remove, revision); setRevision(updated); setFile(undefined); setRemove(false); setMessage("Gespeichert."); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <fieldset disabled={busy} className="panel min-w-0 space-y-3 p-4">
    <legend className="max-w-full break-words px-2 font-semibold">{item.threshold.toLocaleString("de-DE")} {item.kind === "beer-volume" ? "L" : "s"} · {item.title}</legend>
    <MilestoneArtwork assetKey={item.assetKey} kind={item.kind} title={item.title} imageUrl={remove ? null : content?.imageUrl} />
    <label className="block text-sm">Bild auswählen / ersetzen<input className="mt-2 block w-full min-w-0 text-xs" type="file" accept="image/webp,image/png,image/jpeg" onChange={e => { setFile(e.target.files?.[0]); setRemove(false); }} /></label>
    {file && <p className="break-words text-xs">Vorgemerkt: {file.name}</p>}
    <Button type="button" variant="outline" onClick={() => { setRemove(true); setFile(undefined); }}>Bild entfernen</Button>
    {remove && <p className="text-xs">Bild wird beim Speichern entfernt.</p>}
    <label className="block text-sm">Infotext<textarea maxLength={4000} rows={4} value={text} onChange={e => setText(e.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-black/30 p-3" /></label>
    <Button type="button" onClick={() => void save()}>{busy ? "Wird gespeichert / hochgeladen …" : "Speichern"}</Button>
    {message && <p role={failed ? "alert" : "status"} className="text-sm">{message}</p>}
  </fieldset>;
}
