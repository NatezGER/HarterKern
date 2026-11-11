import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach,expect,it,vi } from "vitest";
const h=vi.hoisted(()=>({primaryKind:"normal",result:"valid"}));
vi.mock("@/hooks/useLiveEvent",()=>({useLiveEvent:()=>({postAttempt:{primaryKind:h.primaryKind,result:h.result,playerName:"Test",time:2.34,primaryMessage:"Erfasst",achievements:[]},dismissPostAttempt:vi.fn(),snapEndingCelebration:null})}));
import { PostAttemptResult } from "./PostAttemptResult";
beforeEach(()=>{h.primaryKind="normal";h.result="valid";});
it.each([["wr","Weltrekord"],["season-record","Saisonrekord"],["pb","Persönliche Bestzeit"],["event-best","Eventbestzeit"]])("maps existing %s flags to the appropriate emblem",(kind,label)=>{
 h.primaryKind=kind;expect(renderToStaticMarkup(<PostAttemptResult />)).toContain(`aria-label="${label}"`);
});
it.each(["normal","dns"])("does not invent a record for %s",kind=>{
 h.result=kind;const html=renderToStaticMarkup(<PostAttemptResult />);
 for(const label of ["Weltrekord","Saisonrekord","Persönliche Bestzeit","Eventbestzeit"]) expect(html).not.toContain(`aria-label="${label}"`);
});
