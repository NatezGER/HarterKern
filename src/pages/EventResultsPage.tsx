import { Link, useParams } from "react-router-dom";
import { EventResults } from "@/components/events/EventResults";
import { Button } from "@/components/ui/button";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function EventResultsPage() {
  const { eventId = "" } = useParams();
  const { state } = useLiveEvent();
  const event = state.events.find(({ id }) => id === eventId);
  if (!event) return <NotFoundPage />;
  const attempts = state.attempts.filter((attempt) => attempt.eventId === event.id);
  return (
    <div className="space-y-7">
      <EventResults event={event} attempts={attempts} players={state.players} />
      <Button asChild variant="ghost"><Link to="/events/live">Zur Live-Übersicht</Link></Button>
    </div>
  );
}
