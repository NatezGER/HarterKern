import { expect, it } from "vitest";
import { getLiveTickerMoments } from "./liveTickerMoments";
import type { LiveAttempt, LiveEvent, LiveEventState, LiveParticipant } from "@/types/liveEvent";
const event={id:"e",date:"2026-11-11"} as LiveEvent;
const player=(id:string,kind: "guest"|"permanent"="permanent",isAk=false)=>({id,kind,isAk} as LiveParticipant);
const attempt=(id:string,timeSeconds:number,changes:Partial<LiveAttempt>={}):LiveAttempt=>({id,playerId:"a",eventId:"e",result:"time",timeSeconds,date:event.date,submittedAt:`2026-11-11T12:${id.padStart(2,"0")}:00Z`,outOfCompetition:false,...changes});
const state=(attempts:LiveAttempt[]):LiveEventState=>({version:2,players:[player("a"),player("g","guest"),player("ak","permanent",true)],events:[event],historicalAttempts:[],attempts});
const now=new Date("2026-11-11T15:00Z");
it("bounds moments to one per record type and today's active event",()=>{
 const data=state([attempt("1",4),attempt("2",3),attempt("3",2),attempt("4",1,{eventId:"other"})]);
 const moments=getLiveTickerMoments(data,event,now);
 expect(moments.map(m=>m.kind).sort()).toEqual(["eb","pb","sr","wr"]);
 expect(moments.every(m=>m.attempt.id==="3")).toBe(true);
 expect(getLiveTickerMoments(data,event,new Date("2026-11-12T15:00Z"))).toEqual([]);
});
it("distinguishes SR from past years' WR and excludes guests/AK/DNF from league records",()=>{
 const data=state([attempt("0",1,{date:"2025-01-01",submittedAt:"2025-01-01T12:00Z",eventId:"old"}),attempt("1",4),attempt("2",3),attempt("3",2,{playerId:"g"}),attempt("4",0.5,{playerId:"ak"}),attempt("5",0.1,{result:"dns"})]);
 const moments=getLiveTickerMoments(data,event,now);
 expect(moments.find(m=>m.kind==="sr")?.attempt.id).toBe("2");expect(moments.some(m=>m.kind==="wr")).toBe(false);
 expect(moments.find(m=>m.kind==="eb")?.attempt.playerId).toBe("g");
});
it("does not label the first valid event time as an EB progression",()=>{
 expect(getLiveTickerMoments(state([attempt("1",4)]),event,now).some(m=>m.kind==="eb")).toBe(false);
});
