export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const AWARD_ASSET_MAX_BYTES = 2 * 1024 * 1024;
export const AWARD_ASSET_MIN_DIMENSION = 512;
export const AWARD_ASSET_MIME_TYPES = ["image/png", "image/webp"] as const;

export type ImagePurpose = "avatar" | "event-photo";

export function validateAwardAssetMetadata(
  file: Pick<File, "type" | "size">,
  dimensions?: { width: number; height: number },
): string | null {
  if (!AWARD_ASSET_MIME_TYPES.includes(file.type as (typeof AWARD_ASSET_MIME_TYPES)[number])) {
    return "Award-Grafiken müssen PNG- oder WebP-Dateien sein.";
  }
  if (file.size < 1 || file.size > AWARD_ASSET_MAX_BYTES) {
    return "Die Award-Grafik darf höchstens 2 MB groß sein.";
  }
  if (dimensions && dimensions.width !== dimensions.height) {
    return "Die Award-Grafik muss quadratisch sein.";
  }
  if (dimensions && dimensions.width < AWARD_ASSET_MIN_DIMENSION) {
    return "Die Award-Grafik muss mindestens 512 × 512 px groß sein.";
  }
  return null;
}

export async function validateAwardAssetFile(file: File): Promise<string | null> {
  const metadataError = validateAwardAssetMetadata(file);
  if (metadataError) return metadataError;
  try {
    const image = await createImageBitmap(file);
    const dimensions = { width: image.width, height: image.height };
    image.close();
    return validateAwardAssetMetadata(file, dimensions);
  } catch {
    return "Die Bildabmessungen konnten nicht geprüft werden.";
  }
}

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
