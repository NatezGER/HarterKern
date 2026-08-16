export const postgresUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requirePostgresUuid(value: FormDataEntryValue | null, label: string) {
  const id = typeof value === "string" ? value : "";
  if (!postgresUuidPattern.test(id)) throw new Error(`${label} ist ungültig.`);
  return id;
}

export function requireAwardAssetId(value: FormDataEntryValue | null) {
  const id = typeof value === "string" ? value : "";
  const valid = /^medal:podium:(gold|silver|bronze)$/.test(id)
    || /^badge:[a-z0-9][a-z0-9-]{1,119}$/.test(id)
    || /^trophy:(event|season):[a-z0-9-]{2,80}:\d{4}:(gold|silver|bronze)$/.test(id);
  if (!valid) throw new Error("Award-Auswahl ist ungültig.");
  return id;
}

export function validateAwardImageMetadata(input: {
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}) {
  if (input.mimeType !== "image/png" && input.mimeType !== "image/webp") {
    return "Award-Grafiken müssen PNG- oder WebP-Dateien sein.";
  }
  if (input.size < 1 || input.size > 2 * 1024 * 1024) {
    return "Die Award-Grafik darf maximal 2 MB groß sein.";
  }
  if (input.width != null && input.height != null && input.width !== input.height) {
    return "Die Award-Grafik muss quadratisch sein.";
  }
  if (input.width != null && input.width < 512) {
    return "Die Award-Grafik muss mindestens 512 × 512 px groß sein.";
  }
  return null;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function uint24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

export function readAwardImageDimensions(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/png") {
    if (bytes.length < 24 || ascii(bytes, 1, 3) !== "PNG" || ascii(bytes, 12, 4) !== "IHDR") {
      throw new Error("Die PNG-Datei ist ungültig.");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType !== "image/webp" || bytes.length < 30
    || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    throw new Error("Die WebP-Datei ist ungültig.");
  }
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = ascii(bytes, offset, 4);
    const size = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
    const data = offset + 8;
    if (kind === "VP8X" && data + 10 <= bytes.length) {
      return { width: uint24(bytes, data + 4) + 1, height: uint24(bytes, data + 7) + 1 };
    }
    if (kind === "VP8L" && data + 5 <= bytes.length && bytes[data] === 0x2f) {
      return {
        width: 1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8),
        height: 1 + (bytes[data + 2] >> 6) + (bytes[data + 3] << 2)
          + ((bytes[data + 4] & 0x0f) << 10),
      };
    }
    if (kind === "VP8 " && data + 10 <= bytes.length
      && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
      return {
        width: (bytes[data + 6] | (bytes[data + 7] << 8)) & 0x3fff,
        height: (bytes[data + 8] | (bytes[data + 9] << 8)) & 0x3fff,
      };
    }
    offset = data + size + (size % 2);
  }
  throw new Error("Die WebP-Abmessungen konnten nicht gelesen werden.");
}
