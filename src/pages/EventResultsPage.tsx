import { Link, useParams } from "react-router-dom";
import { EventResults } from "@/components/events/EventResults";
import { PendingAttemptsPanel } from "@/components/events/PendingAttemptsPanel";
import { Button } from "@/components/ui/button";
import { useLiveEvent } from "@/hooks/useLiveEvent";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function EventResultsPage() {
  const { eventId = "" } = useParams();
  const { state } = useLiveEvent();
  const event = state.events.find(({ id }) => id === eventId);
  if (!event) return <NotFoundPage />;
  const attempts = state.attempts.filter((attempt) => attempt.eventId === event.id);
  const pending = attempts.filter(({ status }) => status === "pending");
  return (
    <div className="space-y-7">
      <EventResults event={event} attempts={attempts} />
      <PendingAttemptsPanel event={event} attempts={pending} />
      <Button asChild variant="ghost"><Link to="/events/live">Zur Live-Übersicht</Link></Button>
    </div>
  );
}
