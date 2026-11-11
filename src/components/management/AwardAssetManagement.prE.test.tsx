import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
vi.mock("@/services/awardAssetService",()=>({getBadgeAssetDefinitions:vi.fn().mockResolvedValue([])}));
import { AwardAssetManagement } from "./AwardAssetManagement";
it("offers all five graphic groups and the compatible event default",()=>{
 const html=renderToStaticMarkup(<AwardAssetManagement />);
 for(const label of ["Eventmedaillen","Statistikmedaillen","Rekordsymbole","Badge","Trophäe"]) expect(html).toContain(label);
 expect(html).toContain("medal:podium:gold");expect(html).toContain('accept="image/png,image/webp"');expect(html).toContain("Generisches Fallback");
});
