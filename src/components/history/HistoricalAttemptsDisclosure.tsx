import { Link } from "react-router-dom";
import { HistoricalAttemptList } from "@/components/history/HistoricalAttemptList";
import { Button } from "@/components/ui/button";
import type { HistoricalAttempt } from "@/types/liveEvent";

export function HistoricalAttemptsDisclosure({
  attempts,
  expanded,
  onToggle,
}: {
  attempts: HistoricalAttempt[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return <>
    <Button type="button" variant="outline" aria-expanded={expanded} onClick={onToggle}>
      {expanded ? "Historische Versuche ausblenden" : "Historische Versuche anzeigen"}
    </Button>
    {expanded && <div className="mt-5">
      <HistoricalAttemptList attempts={attempts} limit={6} />
      <Button asChild variant="outline" className="mt-5">
        <Link to="/history">Alle historischen Versuche anzeigen</Link>
      </Button>
    </div>}
  </>;
}
