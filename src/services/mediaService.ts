import { validateImageFile } from "@/lib/media";
import { invokeAdminMedia } from "@/services/adminMediaService";

export async function uploadPlayerAvatar(playerId: string, file: File) {
  const validation = validateImageFile(file, "avatar");
  if (validation) throw new Error(validation);
  const result = await invokeAdminMedia("upload-avatar", { playerId }, file);
  if (!result?.publicUrl) throw new Error("Profilbild wurde nicht vollständig gespeichert.");
  return result.publicUrl;
}

export async function removePlayerAvatar(playerId: string) {
  await invokeAdminMedia("remove-avatar", { playerId });
}

export interface PhotoUploadResult {
  fileName: string;
  ok: boolean;
  error?: string;
}

export async function uploadEventPhotos(eventId: string, files: File[]) {
  const results: PhotoUploadResult[] = [];
  for (const file of files) {
    const validation = validateImageFile(file, "event-photo");
    if (validation) {
      results.push({ fileName: file.name, ok: false, error: validation });
      continue;
    }
    try {
      await invokeAdminMedia("upload-event-photo", { eventId }, file);
      results.push({ fileName: file.name, ok: true });
    } catch (error) {
      results.push({
        fileName: file.name,
        ok: false,
        error: error instanceof Error ? error.message : "Upload fehlgeschlagen.",
      });
    }
  }
  return results;
}

export async function removeEventPhoto(photoId: string) {
  await invokeAdminMedia("remove-event-photo", { photoId });
}
