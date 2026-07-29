import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { DataState } from "@/components/common/DataState";
import { PageHeader } from "@/components/common/PageHeader";
import { HistoricalAttemptList } from "@/components/history/HistoricalAttemptList";
import { Button } from "@/components/ui/button";
import { useDataPlatform } from "@/hooks/useDataPlatform";

export function HistoricalAttemptsPage() {
  const { snapshot, status } = useDataPlatform();
  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm">
        <Link to="/stats#history"><ArrowLeft className="size-4" /> Zurück zu Statistiken</Link>
      </Button>
      <PageHeader
        eyebrow="Zeitarchiv"
        title="Historische Versuche"
        description="Offizielle Einzelzeiten, die keiner vollständig dokumentierten Veranstaltung zugeordnet sind."
      />
      <DataState>
        {status === "ready" ? (
          <HistoricalAttemptList attempts={snapshot.liveState.historicalAttempts} />
        ) : <div />}
      </DataState>
    </div>
  );
}
