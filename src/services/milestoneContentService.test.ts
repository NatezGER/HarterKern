import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ select: vi.fn(), invoke: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ from: () => ({select:mocks.select}),storage:{from:()=>({getPublicUrl:(path:string)=>({data:{publicUrl:`https://example.com/${path}`}})})} }) }));
vi.mock("./adminMediaService", () => ({ invokeAdminMedia: mocks.invoke }));
import { getMilestoneContent, milestoneContentCache, saveMilestoneContent } from "./milestoneContentService";
beforeEach(() => { milestoneContentCache.invalidate(); mocks.select.mockReset(); mocks.invoke.mockReset(); });
describe("milestone editorial content", () => {
  it("reads the full catalogue once and deduplicates concurrent reads", async () => {
    mocks.select.mockResolvedValue({ data:[{milestone_id:"beer-test",info_text:"Text",image_path:"beer-test/image.webp"}],error:null });
    const [a,b] = await Promise.all([getMilestoneContent(),getMilestoneContent()]);
    expect(a).toEqual(b); expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(a["beer-test"].imageUrl).toContain("beer-test/image.webp");
  });
  it("keeps empty content empty and does not invent fallback text", async () => {
    mocks.select.mockResolvedValue({data:[],error:null}); expect(await getMilestoneContent()).toEqual({});
  });
  it("uses existing verified admin service for text/remove/replace and invalidates on success", async () => {
    mocks.invoke.mockResolvedValue({ok:true});
    await saveMilestoneContent("beer-test","new text",undefined,true);
    expect(mocks.invoke).toHaveBeenCalledWith("save-milestone-content",{milestoneId:"beer-test",infoText:"new text",removeImage:"true",updatedAt:""},undefined);
    const file = {type:"image/webp",size:42} as File;
    await saveMilestoneContent("beer-test","",file);
    expect(mocks.invoke).toHaveBeenLastCalledWith("save-milestone-content",expect.objectContaining({removeImage:"false"}),file);
  });
  it("surfaces save errors and rejects invalid image types and size before upload", async () => {
    mocks.invoke.mockRejectedValue(new Error("denied")); await expect(saveMilestoneContent("beer-test","text")).rejects.toThrow("denied");
    mocks.invoke.mockClear();
    await expect(saveMilestoneContent("beer-test","",{type:"image/svg+xml",size:50} as File)).rejects.toThrow();
    await expect(saveMilestoneContent("beer-test","",{type:"image/png",size:6*1024*1024} as File)).rejects.toThrow();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
