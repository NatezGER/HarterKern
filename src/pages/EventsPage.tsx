import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { SeasonContextBadge } from "@/components/common/SeasonContextBadge";
import { EventArchiveList } from "@/components/events/EventArchiveList";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { useSeason } from "@/hooks/useSeason";

export function EventsPage() {
  const { data } = useEffectivePublicData();
  const { season, isAllTime } = useSeason();
  const events = data.events.filter(({ status }) => status === "closed");
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Eventarchiv"
        title="Events"
        description={isAllTime
          ? "Vergangene Abende, Sieger und Ergebnisse."
          : `Vergangene Abende, Sieger und Ergebnisse der Saison ${season}.`}
        action={<SeasonContextBadge />}
      />
      <DataState>
        <EventArchiveList
          events={events}
          emptyLabel={isAllTime
            ? "Noch keine abgeschlossenen Events."
            : `Noch keine abgeschlossenen Events in Saison ${season}.`}
        />
      </DataState>
    </div>
  );
}
