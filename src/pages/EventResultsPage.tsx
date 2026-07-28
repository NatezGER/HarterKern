import { Link, useParams } from "react-router-dom";
import { EventResults } from "@/components/events/EventResults";
import { Button } from "@/components/ui/button";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { DataState } from "@/components/common/DataState";
import { usePublicData } from "@/hooks/usePublicData";

export function EventResultsPage() {
  const { eventId = "" } = useParams();
  const { state } = useLiveEvent();
  const { status } = usePublicData();
  if (status !== "ready") return <DataState><div /></DataState>;
  const event = state.events.find(({ id }) => id === eventId);
  if (!event) return <NotFoundPage />;
  return (
    <div className="space-y-7">
      <EventResults event={event} attempts={state.attempts} players={state.players} />
      <Button asChild variant="ghost"><Link to="/events">Zur Eventübersicht</Link></Button>
    </div>
  );
}
