import { resolveBeerVolumeMilestone } from "@/lib/beerVolume";
import { useMilestoneContent } from "@/hooks/useMilestoneContent";
import { MilestoneArtwork } from "./MilestoneArtwork";
export function BeerVolumeArtwork({ attempts, contain = false }: { attempts: number; contain?: boolean }) {
  const { reached, next } = resolveBeerVolumeMilestone(attempts);
  const milestone = reached ?? next;
  const { data } = useMilestoneContent();
  return <MilestoneArtwork contain={contain} kind="beer-volume" assetKey={milestone?.assetKey} title={milestone?.title ?? "Biermenge"} imageUrl={milestone ? data[milestone.id]?.imageUrl : null} />;
}
