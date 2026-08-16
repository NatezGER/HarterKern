import { createClient } from "npm:@supabase/supabase-js@2";
import {
  readAwardImageDimensions,
  requireAwardAssetId,
  requirePostgresUuid,
  validateAwardImageMetadata,
} from "./validation.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function json(payload: object, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function equalSecret(provided: string, expected: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  ));
}

async function createAdminToken(secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
  const payload = `${expiresAt}.${crypto.randomUUID()}`;
  return `${payload}.${await sign(payload, secret)}`;
}

async function verifyAdminToken(token: string, secret: string) {
  const [expiresAt, nonce, signature, ...rest] = token.split(".");
  if (!expiresAt || !nonce || !signature || rest.length > 0) return false;
  if (!Number.isSafeInteger(Number(expiresAt)) || Number(expiresAt) <= Date.now() / 1000) {
    return false;
  }
  return equalSecret(signature, await sign(`${expiresAt}.${nonce}`, secret));
}

function extensionFor(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

function requireImage(value: FormDataEntryValue | null, limit: number) {
  if (!(value instanceof File)) throw new Error("Bitte eine Bilddatei auswählen.");
  if (!allowedTypes.has(value.type)) {
    throw new Error("Erlaubt sind ausschließlich JPEG, PNG und WebP.");
  }
  if (value.size < 1 || value.size > limit) {
    throw new Error(`Die Bilddatei darf maximal ${limit / 1024 / 1024} MB groß sein.`);
  }
  return value;
}

async function requireAwardImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) throw new Error("Bitte eine Bilddatei auswählen.");
  const fileError = validateAwardImageMetadata({ mimeType: value.type, size: value.size });
  if (fileError) throw new Error(fileError);
  const dimensions = readAwardImageDimensions(
    new Uint8Array(await value.arrayBuffer()),
    value.type,
  );
  const dimensionsError = validateAwardImageMetadata({
    mimeType: value.type,
    size: value.size,
    ...dimensions,
  });
  if (dimensionsError) throw new Error(dimensionsError);
  return { file: value, ...dimensions };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Methode nicht erlaubt." }, 405);

  try {
    const form = await request.formData();
    const expectedCode = Deno.env.get("ADMIN_ACCESS_CODE");
    const tokenSecret = Deno.env.get("ADMIN_TOKEN_SECRET");
    const action = form.get("action");
    if (!expectedCode || !tokenSecret) {
      throw new Error("Serverkonfiguration für den Adminmodus fehlt.");
    }
    if (action === "authorize") {
      const code = form.get("code");
      if (typeof code !== "string" || !(await equalSecret(code, expectedCode))) {
        return json({ error: "Code ist nicht korrekt." }, 401);
      }
      return json({ ok: true, token: await createAdminToken(tokenSecret) });
    }
    const token = form.get("token");
    if (typeof token !== "string" || !(await verifyAdminToken(token, tokenSecret))) {
      return json({ error: "Die Adminfreigabe ist abgelaufen. Bitte erneut öffnen." }, 401);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Serverkonfiguration für Medien fehlt.");
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "upload-avatar") {
      const playerId = requirePostgresUuid(form.get("playerId"), "Spieler");
      const file = requireImage(form.get("file"), 5 * 1024 * 1024);
      const path = `${playerId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
      const player = await supabase.from("players")
        .select("avatar_path").eq("id", playerId).eq("is_archived", false).maybeSingle();
      if (player.error) throw player.error;
      if (!player.data) throw new Error("Spieler wurde nicht gefunden.");

      const uploaded = await supabase.storage.from("player-avatars").upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;

      const updated = await supabase.from("players")
        .update({ avatar_path: path, avatar_url: null }).eq("id", playerId);
      if (updated.error) {
        await supabase.storage.from("player-avatars").remove([path]);
        throw updated.error;
      }
      if (player.data.avatar_path) {
        const cleanup = await supabase.storage
          .from("player-avatars").remove([player.data.avatar_path]);
        if (cleanup.error) {
          throw new Error("Profilbild gespeichert, das vorherige Bild konnte nicht entfernt werden.");
        }
      }
      const publicUrl = supabase.storage.from("player-avatars").getPublicUrl(path)
        .data.publicUrl;
      return json({ ok: true, publicUrl });
    }

    if (action === "remove-avatar") {
      const playerId = requirePostgresUuid(form.get("playerId"), "Spieler");
      const player = await supabase.from("players")
        .select("avatar_path").eq("id", playerId).maybeSingle();
      if (player.error) throw player.error;
      if (!player.data) throw new Error("Spieler wurde nicht gefunden.");
      const cleared = await supabase.from("players")
        .update({ avatar_path: null, avatar_url: null }).eq("id", playerId);
      if (cleared.error) throw cleared.error;
      if (player.data.avatar_path) {
        const removed = await supabase.storage
          .from("player-avatars").remove([player.data.avatar_path]);
        if (removed.error) {
          throw new Error("Profilbild entkoppelt, die Datei konnte nicht entfernt werden.");
        }
      }
      return json({ ok: true });
    }

    if (action === "upload-event-photo") {
      const eventId = requirePostgresUuid(form.get("eventId"), "Event");
      const file = requireImage(form.get("file"), 8 * 1024 * 1024);
      const event = await supabase.from("events").select("id")
        .eq("id", eventId).eq("status", "closed").is("deleted_at", null).maybeSingle();
      if (event.error) throw event.error;
      if (!event.data) throw new Error("Das Event ist nicht verfügbar oder noch aktiv.");
      const path = `${eventId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
      const uploaded = await supabase.storage.from("event-photos").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;

      const last = await supabase.from("event_photos").select("sort_order")
        .eq("event_id", eventId).order("sort_order", { ascending: false }).limit(1)
        .maybeSingle();
      if (last.error) {
        await supabase.storage.from("event-photos").remove([path]);
        throw last.error;
      }
      const inserted = await supabase.from("event_photos").insert({
        event_id: eventId,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        sort_order: (last.data?.sort_order ?? -1) + 1,
      });
      if (inserted.error) {
        await supabase.storage.from("event-photos").remove([path]);
        throw inserted.error;
      }
      return json({ ok: true });
    }

    if (action === "remove-event-photo") {
      const photoId = requirePostgresUuid(form.get("photoId"), "Foto");
      const photo = await supabase.from("event_photos")
        .select("storage_path").eq("id", photoId).maybeSingle();
      if (photo.error) throw photo.error;
      if (!photo.data) throw new Error("Foto wurde nicht gefunden.");
      const deleted = await supabase.from("event_photos").delete().eq("id", photoId);
      if (deleted.error) throw deleted.error;
      const removed = await supabase.storage
        .from("event-photos").remove([photo.data.storage_path]);
      if (removed.error) {
        throw new Error("Foto ausgeblendet, die Datei konnte nicht entfernt werden.");
      }
      return json({ ok: true });
    }

    if (action === "upload-award-asset") {
      const assetId = requireAwardAssetId(form.get("assetId"));
      const assetType = assetId.split(":", 1)[0];
      const { file, width, height } = await requireAwardImage(form.get("file"));

      if (assetType === "badge") {
        const badgeKey = assetId.slice("badge:".length);
        const badge = await supabase.from("badge_definitions")
          .select("badge_key").eq("badge_key", badgeKey).eq("is_active", true).maybeSingle();
        if (badge.error) throw badge.error;
        if (!badge.data) throw new Error("Diese Badge-Variante existiert nicht.");
      }

      const current = await supabase.from("award_assets")
        .select("storage_path").eq("asset_id", assetId).maybeSingle();
      if (current.error) throw current.error;
      const path = `${assetId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
      const uploaded = await supabase.storage.from("award-assets").upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;
      const saved = await supabase.from("award_assets").upsert({
        asset_id: assetId,
        asset_type: assetType,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        width,
        height,
        updated_at: new Date().toISOString(),
      });
      if (saved.error) {
        await supabase.storage.from("award-assets").remove([path]);
        throw saved.error;
      }
      if (current.data?.storage_path) {
        await supabase.storage.from("award-assets").remove([current.data.storage_path]);
      }
      const publicUrl = supabase.storage.from("award-assets").getPublicUrl(path).data.publicUrl;
      return json({ ok: true, publicUrl });
    }

    if (action === "remove-award-asset") {
      const assetId = requireAwardAssetId(form.get("assetId"));
      const current = await supabase.from("award_assets")
        .select("storage_path").eq("asset_id", assetId).maybeSingle();
      if (current.error) throw current.error;
      if (!current.data) return json({ ok: true });
      const deleted = await supabase.from("award_assets").delete().eq("asset_id", assetId);
      if (deleted.error) throw deleted.error;
      const removed = await supabase.storage.from("award-assets")
        .remove([current.data.storage_path]);
      if (removed.error) {
        throw new Error("Custom-Grafik entfernt, die alte Datei konnte nicht bereinigt werden.");
      }
      return json({ ok: true });
    }

    return json({ error: "Unbekannte Medienaktion." }, 400);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Medienaktion fehlgeschlagen.",
    }, 400);
  }
});
