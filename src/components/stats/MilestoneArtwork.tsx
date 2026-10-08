import { useState } from "react";
import { Beer, Timer } from "lucide-react";
import type { TeamMilestoneKind } from "@/constants/teamMilestones";
const assets = import.meta.glob<string>("/src/assets/team-milestones/*.{avif,webp,png,jpg,jpeg,svg}", { eager: true, query: "?url", import: "default" });
export function MilestoneArtwork({ assetKey, kind, title }: { assetKey?: string; kind: TeamMilestoneKind; title: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = ["avif","webp","png","jpg","jpeg","svg"].map(ext => assets[`/src/assets/team-milestones/${assetKey}.${ext}`]).find(Boolean);
  const Icon = kind === "beer-volume" ? Beer : Timer;
  return <div data-artwork-slot={assetKey ?? kind+"-start"} className="relative grid aspect-[16/9] w-full min-w-0 place-items-center overflow-hidden rounded-2xl border border-gold-300/15 bg-gradient-to-br from-gold-300/10 via-black/20 to-black/40">
    {url && url !== failed ? <img src={url} alt={title} loading="lazy" className="absolute inset-0 size-full object-contain p-3" onError={() => setFailed(url)} />
      : <div data-artwork-fallback className="grid place-items-center gap-2 p-4 text-gold-200/60"><Icon className="size-12" aria-hidden="true" /><span className="text-[10px] uppercase tracking-[0.2em]">Team-Meilenstein</span></div>}
  </div>;
}
