import { expect, it } from "vitest";
import { requireAwardAssetId, requireAwardStoragePath, validateAwardImageMetadata } from "./validation.ts";
import { awardAssetType } from "@/lib/awardAssets";
import { validateAwardAssetMetadata } from "@/lib/media";
const slots=["medal:podium:gold","medal:statistics:gold","medal:statistics:silver","medal:statistics:bronze","record:wr","record:sr","record:pb","record:eb","badge:test-badge","trophy:historical:first-sub-3","trophy:season:2026:gold"];
it.each(slots)("accepts %s consistently and restricts storage ownership",id=>{
 expect(requireAwardAssetId(id)).toBe(id);expect(awardAssetType(id)).toBe(id.split(":")[0]);
 const path=`${id}/00000000-0000-0000-0000-000000000001.png`;
 expect(requireAwardStoragePath(id,path)).toBe(path);
 expect(()=>requireAwardStoragePath(id,`record:unknown/${path.split("/")[1]}`)).toThrow();
 expect(()=>requireAwardStoragePath(id,`${id}/../other.png`)).toThrow();
});
it.each(["record:unknown","record:wr:extra","medal:statistics:platinum","record:../wr"])("rejects %s",id=>{
 expect(()=>requireAwardAssetId(id)).toThrow();expect(awardAssetType(id)).toBeNull();
});
it.each(["medal","record"] as const)("retains strict dimensions and formats for %s",type=>{
 const valid={mimeType:"image/webp",size:1024,width:512,height:512};
 expect(validateAwardImageMetadata(valid,type)).toBeNull();
 for(const change of [{size:2097153},{mimeType:"image/jpeg"},{width:511,height:511},{height:1024}]) {
  const value={...valid,...change};expect(validateAwardImageMetadata(value,type)).not.toBeNull();
  expect(validateAwardAssetMetadata({type:value.mimeType,size:value.size},value,type)).not.toBeNull();
 }
});
