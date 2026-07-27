import { CurrentEventCard } from "@/components/dashboard/CurrentEventCard";
import { DailyBestCards } from "@/components/dashboard/DailyBestCards";
import { HallOfFamePreview } from "@/components/dashboard/HallOfFamePreview";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { WRProgression } from "@/components/dashboard/WRProgression";
import { WorldRecordCard } from "@/components/dashboard/WorldRecordCard";
import { Podium } from "@/components/leaderboard/Podium";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { DataState } from "@/components/common/DataState";

export function DashboardPage() {
  return (
    <div className="space-y-12 lg:space-y-16">
      <HeroCard />
      <DataState>
        <div className="space-y-12 lg:space-y-16">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <WorldRecordCard />
            <AnimatedCard className="px-4 pt-6 sm:px-8" hover={false}>
              <SectionHeading eyebrow="Top 3 All-Time" title="Das Podium" />
              <Podium />
            </AnimatedCard>
          </div>
          <HallOfFamePreview />
          <DailyBestCards />
          <div className="grid gap-6 xl:grid-cols-2">
            <WRProgression />
            <div>
              <SectionHeading eyebrow="Live" title="Aktuelles Event" />
              <CurrentEventCard />
            </div>
          </div>
        </div>
      </DataState>
    </div>
  );
}
