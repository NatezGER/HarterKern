import { Link, useParams } from "react-router-dom";
import { EventResults } from "@/components/events/EventResults";
import { Button } from "@/components/ui/button";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DataState } from "@/components/common/DataState";
import { useEventDetail } from "@/hooks/useHistoryProfiles";

export function EventResultsPage() {
  const { eventId = "" } = useParams();
  const { data, loading, error } = useEventDetail(eventId);
  if (loading) return <DataState><div /></DataState>;
  if (!data) return error
    ? <div className="panel p-8 text-center text-red-200">{error}</div>
    : <NotFoundPage />;
  return (
    <div className="space-y-7">
      <EventResults detail={data} />
      <Button asChild variant="ghost"><Link to="/stats#events">Zur Eventübersicht</Link></Button>
    </div>
  );
}
