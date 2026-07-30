import { getSupabase } from "@/lib/supabase";

const managementTokenKey = "harter-kern-management-token";

interface AdminMediaResponse {
  ok?: boolean;
  publicUrl?: string;
  token?: string;
}

export function getStoredManagementToken() {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(managementTokenKey) ?? "";
}

export function clearManagementCode() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(managementTokenKey);
  }
}

async function readFunctionError(error: unknown) {
  if (
    typeof error === "object"
    && error !== null
    && "context" in error
    && error.context instanceof Response
  ) {
    const payload = await error.context.clone().json().catch(() => null) as {
      error?: string;
    } | null;
    if (payload?.error) return payload.error;
  }
  return error instanceof Error ? error.message : "Medienaktion fehlgeschlagen.";
}

export async function invokeAdminMedia(
  action: string,
  fields: Record<string, string>,
  file?: File,
) {
  const token = action === "authorize" ? "" : getStoredManagementToken();
  if (action !== "authorize" && !token) {
    throw new Error("Der Adminmodus ist nicht freigeschaltet.");
  }

  const body = new FormData();
  body.set("action", action);
  if (token) body.set("token", token);
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));
  if (file) body.set("file", file);

  const { data, error } = await getSupabase().functions.invoke<AdminMediaResponse>(
    "admin-media",
    { body },
  );
  if (error) throw new Error(await readFunctionError(error));
  return data;
}

export async function verifyManagementCode(code: string) {
  const normalized = code.trim();
  if (!normalized) return false;
  try {
    const result = await invokeAdminMedia("authorize", { code: normalized });
    if (!result?.token) throw new Error("Adminfreigabe wurde nicht vollständig erstellt.");
    sessionStorage.setItem(managementTokenKey, result.token);
    return true;
  } catch (error) {
    if (error instanceof Error && /nicht korrekt/i.test(error.message)) return false;
    throw error;
  }
}
