import { getSupabase } from "@/lib/supabase";
import { createStoragePath, validateImageFile } from "@/lib/media";

async function requireAdminMediaAccess() {
  const client = getSupabase();
  const session = await client.auth.getSession();
  if (session.error || !session.data.session) {
    throw new Error(
      "Für Medienänderungen fehlt die geschützte Supabase-Adminsession.",
    );
  }
  const admin = await client.rpc("is_admin");
  if (admin.error || admin.data !== true) {
    throw new Error("Die aktuelle Sitzung besitzt keine Medienberechtigung.");
  }
  return client;
}

export async function uploadPlayerAvatar(playerId: string, file: File) {
  const validation = validateImageFile(file, "avatar");
  if (validation) throw new Error(validation);
  const client = await requireAdminMediaAccess();
  const path = createStoragePath(playerId, file.type);
  const upload = await client.storage.from("player-avatars").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const saved = await client.rpc("admin_set_player_avatar", {
    p_player_id: playerId,
    p_storage_path: path,
  });
  if (saved.error) {
    await client.storage.from("player-avatars").remove([path]);
    throw saved.error;
  }
  if (saved.data) {
    const cleanup = await client.storage.from("player-avatars").remove([saved.data]);
    if (cleanup.error) throw new Error("Bild gespeichert, altes Objekt konnte nicht entfernt werden.");
  }
  return client.storage.from("player-avatars").getPublicUrl(path).data.publicUrl;
}

export async function removePlayerAvatar(playerId: string) {
  const client = await requireAdminMediaAccess();
  const cleared = await client.rpc("admin_clear_player_avatar", { p_player_id: playerId });
  if (cleared.error) throw cleared.error;
  if (!cleared.data) return;
  const removed = await client.storage.from("player-avatars").remove([cleared.data]);
  if (removed.error) throw new Error("Bild entkoppelt, Storage-Objekt konnte nicht entfernt werden.");
}

export interface PhotoUploadResult {
  fileName: string;
  ok: boolean;
  error?: string;
}

export async function uploadEventPhotos(eventId: string, files: File[]) {
  const client = getSupabase();
  const results: PhotoUploadResult[] = [];
  for (const file of files) {
    const validation = validateImageFile(file, "event-photo");
    if (validation) {
      results.push({ fileName: file.name, ok: false, error: validation });
      continue;
    }
    const path = createStoragePath(eventId, file.type);
    const upload = await client.storage.from("event-photos").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) {
      results.push({ fileName: file.name, ok: false, error: upload.error.message });
      continue;
    }
    const registered = await client.rpc("admin_register_event_photo", {
      p_event_id: eventId,
      p_storage_path: path,
      p_mime_type: file.type,
      p_size_bytes: file.size,
      p_caption: null,
    });
    if (registered.error) {
      await client.storage.from("event-photos").remove([path]);
      results.push({ fileName: file.name, ok: false, error: registered.error.message });
      continue;
    }
    results.push({ fileName: file.name, ok: true });
  }
  return results;
}

export async function removeEventPhoto(photoId: string) {
  const client = getSupabase();
  const metadata = await client.rpc("admin_remove_event_photo", { p_photo_id: photoId });
  if (metadata.error) throw metadata.error;
  const removed = await client.storage.from("event-photos").remove([metadata.data]);
  if (removed.error) throw new Error("Foto ausgeblendet, Storage-Objekt konnte nicht entfernt werden.");
}
