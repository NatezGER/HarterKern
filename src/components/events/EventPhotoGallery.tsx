import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EventModal } from "@/components/events/EventModal";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useDataPlatform } from "@/hooks/useDataPlatform";
import { removeEventPhoto, uploadEventPhotos } from "@/services/mediaService";
import type { MediaPhoto } from "@/types/historyProfiles";

export function EventPhotoGallery({ eventId, photos }: {
  eventId: string;
  photos: MediaPhoto[];
}) {
  const { isAdmin } = useAdminSession();
  const { refresh } = useDataPlatform();
  const [preview, setPreview] = useState<MediaPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const upload = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    setBusy(true);
    try {
      const results = await uploadEventPhotos(eventId, [...files]);
      const failed = results.filter(({ ok }) => !ok);
      setMessage(failed.length
        ? `${results.length - failed.length} hochgeladen, ${failed.length} fehlgeschlagen: ${failed[0].error}`
        : `${results.length} Foto${results.length === 1 ? "" : "s"} hochgeladen.`);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const remove = async (photoId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await removeEventPhoto(photoId);
      setMessage("Foto entfernt.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Foto konnte nicht entfernt werden.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="display-title text-3xl">Eventfotos</h2>
        {isAdmin && <Button asChild variant="outline" size="sm"><label className={busy ? "pointer-events-none opacity-50" : "cursor-pointer"}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Fotos wählen<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void upload(event.target.files)} /></label></Button>}
      </div>
      {photos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{photos.map((photo) => <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-white/[0.03]"><button type="button" onClick={() => setPreview(photo)} className="size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400" aria-label="Foto groß anzeigen"><img src={photo.url} alt={photo.caption ?? "Eventfoto"} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" /></button>{isAdmin && <button type="button" disabled={busy} onClick={() => void remove(photo.id)} className="absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-black/75 text-red-200" aria-label="Foto entfernen"><Trash2 className="size-4" /></button>}</div>)}</div>}
      {photos.length === 0 && isAdmin && <div className="panel py-10 text-center text-sm text-white/40">Noch keine Eventfotos.</div>}
      <p aria-live="polite" className="mt-3 text-sm text-white/50">{message}</p>
      <EventModal open={Boolean(preview)} title="Eventfoto" onClose={() => setPreview(null)} className="sm:max-w-4xl">
        {preview && <img src={preview.url} alt={preview.caption ?? "Eventfoto"} className="max-h-[70dvh] w-full rounded-2xl object-contain" />}
      </EventModal>
    </section>
  );
}
