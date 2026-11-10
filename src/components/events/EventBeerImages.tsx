import { useEffect, useState } from "react";
import { useDataGroup } from "@/hooks/useDataPlatform";
import { getSupabase } from "@/lib/supabase";
import { BeerBottle } from "@/components/stats/BeerBottle";
export function EventBeerImages({ eventId }: { eventId: string }) {
 const { version } = useDataGroup("event-detail");
 const [state,setState] = useState<{id:string; beers:{brand:string;image_path:string|null}[]; error:boolean}>({id:"",beers:[],error:false});
 const [retry,setRetry] = useState(0);
 useEffect(()=>{
  const controller = new AbortController();
  setState({id:"",beers:[],error:false});
  void (async()=>{
   try {
    const {data,error}=await getSupabase().rpc("get_event_beer_images",{p_event_id:eventId}).abortSignal(controller.signal);
    if (error) throw error;
    if (!controller.signal.aborted) setState({id:eventId,beers:data ?? [],error:false});
   } catch { if (!controller.signal.aborted) setState({id:eventId,beers:[],error:true}); }
  })();
  return ()=>controller.abort();
 },[eventId,retry,version]);
 if (state.id!==eventId) return <p role="status" className="text-xs text-white/40">Bierbilder werden geladen …</p>;
 if (state.error) return <button onClick={()=>setRetry(n=>n+1)} className="text-xs text-white/50">Bierbilder erneut laden</button>;
 return <EventBeerImageList beers={state.beers} />;
}
export function EventBeerImageList({beers}:{beers:{brand:string;image_path:string|null}[]}) {
 if (!beers.length) return null;
 return <div aria-label="Getrunkene Biere" className="flex max-w-full items-start gap-3 overflow-x-auto pb-2 md:max-w-sm">
  {beers.map(beer=><details key={beer.brand} className="w-20 shrink-0 text-center">
   <summary title={beer.brand} aria-label={beer.brand} className="flex cursor-pointer list-none justify-center rounded-lg focus-visible:outline focus-visible:outline-gold-300"><BeerBottle path={beer.image_path} /></summary>
   <p className="mt-1 break-words text-xs text-white/65 [overflow-wrap:anywhere]">{beer.brand}</p>
  </details>)}
 </div>;
}
