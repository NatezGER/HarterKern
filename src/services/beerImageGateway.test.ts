import { readFileSync } from "node:fs";
import ts from "typescript";
import { beforeEach, expect, it, vi } from "vitest";
// Transpile the unchanged Deno validation module too, keeping .ts imports out of the app build.
const validationSource=readFileSync("supabase/functions/admin-media/validation.ts","utf8")
  .replace('import { isTrophySlotAssetId } from "./trophySlots.ts";', "");
const validationExports: Record<string, unknown> = {};
new Function("exports", ts.transpileModule(validationSource, {
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
}).outputText)(validationExports);
const readAwardImageDimensions=validationExports.readAwardImageDimensions;
// Execute the actual edge handler with an in-memory service client, never Supabase.
// Deno's npm import is injected here; auth/signature and mutation branches stay real.
const source=readFileSync("supabase/functions/admin-media/index.ts","utf8")
  .replace(/import \{ createClient \} from "npm:[^"]+";/, "")
  .replace(/import \{[\s\S]*?\} from "\.\/validation.ts";/, "");
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
let handler: (request: Request)=>Promise<Response>;
let row: {image_path:string}|null;
let token: string;
let failSave=false;
const upload=vi.fn(), remove=vi.fn();
const client={
  rpc: async()=>({data:[{brand:"Known"}],error:null}),
  storage:{from:()=>({upload,remove})},
  from:()=>({
    select:()=>({eq:()=>({maybeSingle:async()=>({data:row,error:null})})}),
    insert:(value:{image_path:string})=>({select:async()=>{
      if(failSave)return {data:null,error:new Error("save failed")};
      row=value;return {data:[{brand:"Known"}],error:null};
    }}),
    update:(value:{image_path:string})=>({eq:()=>({eq:()=>({select:async()=>{
      if(failSave)return {data:[],error:null};
      row=value;return {data:[{brand:"Known"}],error:null};
    }})})}),
    delete:()=>({eq:()=>({eq:()=>({select:async()=>{row=null;return {data:[{brand:"Known"}],error:null};}})})}),
  }),
};
async function request(action:string, fields:Record<string,string>={}, file?:File, authenticated=true){
  const form=new FormData();form.set("action",action);
  if(authenticated)form.set("token",token);
  Object.entries(fields).forEach(([k,v])=>form.set(k,v));
  if(file)form.set("file",file);
  return handler(new Request("https://edge.test",{method:"POST",body:form}));
}
function png(){
  const bytes=new Uint8Array(24); bytes.set([137,80,78,71,13,10,26,10]);
  bytes.set([73,72,68,82],12); const view=new DataView(bytes.buffer);
  view.setUint32(16,100);view.setUint32(20,200);
  return new File([bytes],"bottle.png",{type:"image/png"});
}
beforeEach(async()=>{
  row=null;failSave=false;upload.mockReset().mockResolvedValue({error:null});remove.mockReset().mockResolvedValue({error:null});
  new Function("Deno","createClient","readAwardImageDimensions",code)(
    {env:{get:(key:string)=>key==="ADMIN_ACCESS_CODE"?"secret":"test-secret"},serve:(fn:typeof handler)=>{handler=fn;}},
    ()=>client, readAwardImageDimensions,
  );
  const auth=await request("authorize",{code:"secret"},undefined,false);
  token=(await auth.json()).token;
});
it("rejects unauthorized upload/delete before storage access",async()=>{
  for(const action of ["upload-beer-image","remove-beer-image"]){
    expect((await request(action,{brand:"Known"},png(),false)).status).toBe(401);
  }
  expect(upload).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
});
it("uploads, replaces and deletes with DB-first unlink and old-object cleanup",async()=>{
  expect((await request("upload-beer-image",{brand:"Known",previousPath:""},png())).status).toBe(200);
  const old=row!.image_path;
  expect((await request("upload-beer-image",{brand:"Known",previousPath:old},png())).status).toBe(200);
  expect(remove).toHaveBeenCalledWith([old]);
  const next=row!.image_path;
  expect(next).not.toBe(old);
  expect((await request("remove-beer-image",{brand:"Known",previousPath:next})).status).toBe(200);
  expect(row).toBeNull();expect(remove).toHaveBeenLastCalledWith([next]);
});
it("rejects stale edits, unknown brands and corrupt files",async()=>{
  row={image_path:"current.webp"};
  expect((await request("upload-beer-image",{brand:"Known",previousPath:"old.webp"},png())).status).toBe(400);
  expect((await request("upload-beer-image",{brand:"Unknown"},png())).status).toBe(400);
  expect((await request("upload-beer-image",{brand:"Known",previousPath:"current.webp"},new File(["bad"],"bad.png",{type:"image/png"}))).status).toBe(400);
  expect(upload).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
});
it("cleans only its new object when a conditional database save fails",async()=>{
  row={image_path:"preserved.webp"};failSave=true;
  expect((await request("upload-beer-image",{brand:"Known",previousPath:"preserved.webp"},png())).status).toBe(400);
  expect(row.image_path).toBe("preserved.webp");
  expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  expect(remove).not.toHaveBeenCalledWith(["preserved.webp"]);
});
