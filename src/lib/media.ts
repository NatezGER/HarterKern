export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

export type ImagePurpose = "avatar" | "event-photo";

const extensions: Record<(typeof IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateImageFile(
  file: Pick<File, "type" | "size">,
  purpose: ImagePurpose,
): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])) {
    return "Bitte wähle ein JPEG-, PNG- oder WebP-Bild.";
  }
  const limit = purpose === "avatar" ? AVATAR_MAX_BYTES : EVENT_PHOTO_MAX_BYTES;
  if (file.size < 1 || file.size > limit) {
    return `Das Bild darf höchstens ${limit / 1024 / 1024} MB groß sein.`;
  }
  return null;
}

export function createStoragePath(
  entityId: string,
  mimeType: string,
  objectId = crypto.randomUUID(),
) {
  const extension = extensions[mimeType as keyof typeof extensions];
  if (!/^[0-9a-f-]{36}$/i.test(entityId) || !/^[0-9a-f-]{36}$/i.test(objectId) || !extension) {
    throw new Error("Sicherer Bildpfad konnte nicht erzeugt werden.");
  }
  return `${entityId}/${objectId}.${extension}`;
}

export function formatDrinkVolume(validAttempts: number, millilitersPerAttempt: number) {
  const liters = Math.max(0, validAttempts) * millilitersPerAttempt / 1000;
  return `${liters.toLocaleString("de-DE", {
    minimumFractionDigits: liters < 10 ? 2 : 1,
    maximumFractionDigits: 2,
  })} l`;
}
