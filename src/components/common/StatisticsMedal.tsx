import { Medal } from "lucide-react";
import { AwardAssetImage } from "./AwardAssetImage";
import { statisticsMedalAssetId, type MedalRank } from "@/lib/awardAssets";
const colors = { 1: "text-gold-200", 2: "text-slate-200", 3: "text-amber-600" };
export function StatisticsMedal({ rank }: { rank: MedalRank }) {
  return <span aria-hidden="true" className={`relative block size-5 shrink-0 sm:size-7 ${colors[rank]}`}><AwardAssetImage assetId={statisticsMedalAssetId(rank)} alt="" fallback={<Medal className="size-full" />} /></span>;
}
