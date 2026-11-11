import { AwardAssetImage } from "./AwardAssetImage";
import { recordAssetId, type RecordKind } from "@/lib/awardAssets";
import { cn } from "@/lib/cn";
const labels = { wr: "Weltrekord", sr: "Saisonrekord", pb: "Persönliche Bestzeit", eb: "Eventbestzeit" };
const colors = { wr: "border-gold-300/50 text-gold-200", sr: "border-emerald-300/50 text-emerald-200", pb: "border-sky-300/50 text-sky-200", eb: "border-violet-300/50 text-violet-200" };
export function RecordEmblem({ kind, size = "sm", className }: { kind: RecordKind; size?: "sm" | "lg"; className?: string }) {
  return <span aria-label={labels[kind]} className={cn("relative inline-block shrink-0", size === "lg" ? "size-20" : "size-10", className)}>
    <AwardAssetImage assetId={recordAssetId(kind)} alt={labels[kind]} fallback={<span className={cn("grid size-full place-items-center rounded-xl border bg-black/20 font-display font-black", colors[kind], size === "lg" ? "text-3xl" : "text-sm")}>{kind.toUpperCase()}</span>} />
  </span>;
}
