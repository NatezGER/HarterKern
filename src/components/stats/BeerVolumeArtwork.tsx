import { resolveBeerVolumeMilestone } from "@/lib/beerVolume";
import { useMilestoneContent } from "@/hooks/useMilestoneContent";
import { MilestoneArtwork } from "./MilestoneArtwork";
export function BeerVolumeArtwork({ attempts }: { attempts: number }) {
  const { reached, next } = resolveBeerVolumeMilestone(attempts);
  const milestone = reached ?? next;
  const { data } = useMilestoneContent();
  return <MilestoneArtwork kind="beer-volume" assetKey={milestone?.assetKey} title={milestone?.title ?? "Biermenge"} imageUrl={milestone ? data[milestone.id]?.imageUrl : null} />;
}
