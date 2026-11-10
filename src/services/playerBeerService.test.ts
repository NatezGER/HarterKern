import { beforeEach, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({getSupabase: () => ({rpc})}));
import { getPlayerBeerProfile } from "./playerBeerService";
import { clearPlayerProfileCache, loadPlayerProfileSection, invalidatePlayerProfileSections, profileSectionsForDataGroups } from "./playerProfileService";
import { groupsForRealtimeTable } from "./dataGroupService";
beforeEach(() => {rpc.mockReset(); clearPlayerProfileCache();});
it.each([undefined,2026,2027])("uses one player-scoped request for %s", async year => {
 const data = {seasonYear:year ?? null,validAttempts:4,beers:[{brand:"A",bestHundredths:200,attempts:1,imagePath:null}]};
 rpc.mockResolvedValue({data,error:null});
 expect(await getPlayerBeerProfile("p",year)).toEqual(data);
 expect(rpc).toHaveBeenCalledExactlyOnceWith("get_player_beer_profile",{p_player_id:"p",p_season_year:year ?? null});
});
it("does not turn a failed or wrong-scope read into an empty result", async () => {
 rpc.mockResolvedValue({data:null,error:new Error("offline")});
 await expect(getPlayerBeerProfile("p")).rejects.toThrow("offline");
 rpc.mockResolvedValue({data:{seasonYear:2026,validAttempts:0,beers:[]},error:null});
 await expect(getPlayerBeerProfile("p")).rejects.toThrow();
});
it("deduplicates and invalidates personal reads", async () => {
 rpc.mockResolvedValue({data:{seasonYear:null,validAttempts:0,beers:[]},error:null});
 await Promise.all([loadPlayerProfileSection("beer","p"),loadPlayerProfileSection("beer","p")]);
 expect(rpc).toHaveBeenCalledTimes(1);
 invalidatePlayerProfileSections(["beer"],"p");
 await loadPlayerProfileSection("beer","p"); expect(rpc).toHaveBeenCalledTimes(2);
 for (const table of ["attempts","players","events","beer_brand_images"]) expect(groupsForRealtimeTable(table)).toContain("profile-beer");
 expect(profileSectionsForDataGroups(["profile-beer"])).toEqual(["beer"]);
});
