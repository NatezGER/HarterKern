import { getSupabase } from "@/lib/supabase";
import { validateImageFile } from "@/lib/media";
import { invokeAdminMedia } from "./adminMediaService";
import { ReadCache } from "./readCache";

export interface MilestoneContent { infoText: string | null; imageUrl: string | null; updatedAt?: string }
export type MilestoneContentMap = Record<string, MilestoneContent>;
export const milestoneContentCache = new ReadCache<MilestoneContentMap>();
export const MILESTONE_CONTENT_CHANGED = "milestone-content-changed";
export function getMilestoneContent() {
  return milestoneContentCache.read("catalog", async () => {
    const client = getSupabase();
    const { data, error } = await client.from("team_milestone_content").select("milestone_id,info_text,image_path,updated_at");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map(row => [row.milestone_id, {
      infoText: row.info_text,
      updatedAt: row.updated_at,
      imageUrl: row.image_path ? client.storage.from("team-milestone-artwork").getPublicUrl(row.image_path).data.publicUrl : null,
    }]));
  });
}
export async function saveMilestoneContent(id: string, infoText: string, file?: File, removeImage = false, updatedAt = "") {
  if (file) { const error = validateImageFile(file, "avatar"); if (error) throw new Error(error); }
  const result = await invokeAdminMedia("save-milestone-content", {
    milestoneId: id, infoText, removeImage: String(removeImage), updatedAt,
  }, file);
  if (!result?.ok) throw new Error("Inhalt wurde nicht gespeichert.");
  milestoneContentCache.invalidate();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MILESTONE_CONTENT_CHANGED));
  return result.updatedAt;
}
